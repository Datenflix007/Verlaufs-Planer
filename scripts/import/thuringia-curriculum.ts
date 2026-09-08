import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { eq } from 'drizzle-orm';

import { db } from '../../src/lib/server/db';
import { curriculumSources, curriculumValidityRules } from '../../src/lib/server/db/schema';
import type { CurriculumSourceAnnotationDraft } from '../../src/lib/shared/annotation/curriculum';

const inputPath = 'data/preprocessed/thuringia-curriculum-sources.json';

function stableId(prefix: string, parts: Array<string | number | null | undefined>) {
	const value = parts.map((part) => String(part ?? '').trim().toLowerCase()).join('|');
	const digest = createHash('sha256').update(value).digest('hex').slice(0, 20);

	return `${prefix}-${digest}`;
}

function readDrafts() {
	return JSON.parse(readFileSync(inputPath, 'utf8')) as CurriculumSourceAnnotationDraft[];
}

const drafts = readDrafts();
const now = new Date().toISOString();

const counters = db.transaction((sourceDrafts: CurriculumSourceAnnotationDraft[]) => {
	let sourceCount = 0;
	let validityRuleCount = 0;
	let reviewNeededCount = 0;

	for (const draft of sourceDrafts) {
		const sourceId = stableId('th-src', [
			draft.jurisdiction,
			draft.schoolType,
			draft.subject,
			draft.title,
			draft.sourceUrl
		]);
		const existing = db
			.select({ reviewStatus: curriculumSources.reviewStatus, createdAt: curriculumSources.createdAt })
			.from(curriculumSources)
			.where(eq(curriculumSources.id, sourceId))
			.get();
		const reviewStatus = existing?.reviewStatus === 'reviewed' ? 'reviewed' : draft.reviewStatus;
		const contentHash =
			typeof draft.sourceMetadata.sha256 === 'string' ? draft.sourceMetadata.sha256 : null;

		db.insert(curriculumSources)
			.values({
				id: sourceId,
				jurisdiction: draft.jurisdiction,
				schoolType: draft.schoolType,
				subject: draft.subject,
				title: draft.title,
				year: draft.year,
				versionLabel: draft.versionLabel,
				versionStatus: draft.versionStatus,
				sourceUrl: draft.sourceUrl,
				localPath: draft.localPath,
				contentHash,
				reviewStatus,
				sourceMetadataJson: draft.sourceMetadata,
				createdAt: existing?.createdAt ?? now,
				updatedAt: now
			})
			.onConflictDoUpdate({
				target: curriculumSources.id,
				set: {
					year: draft.year,
					versionLabel: draft.versionLabel,
					versionStatus: draft.versionStatus,
					sourceUrl: draft.sourceUrl,
					localPath: draft.localPath,
					contentHash,
					reviewStatus,
					sourceMetadataJson: draft.sourceMetadata,
					updatedAt: now
				}
			})
			.run();

		db.delete(curriculumValidityRules)
			.where(eq(curriculumValidityRules.curriculumSourceId, sourceId))
			.run();

		const validityRows = draft.validityRules.flatMap((rule) =>
			rule.gradeLevels.map((gradeLevel) => ({
				id: stableId('th-rule', [
					sourceId,
					rule.ruleType,
					rule.schoolYear,
					gradeLevel,
					rule.sourceText
				]),
				curriculumSourceId: sourceId,
				validFromSchoolYear: rule.schoolYear,
				validToSchoolYear: null,
				gradeLevel,
				ruleType: rule.ruleType,
				note: null,
				sourceText: rule.sourceText,
				confidence: rule.confidence,
				createdAt: now,
				updatedAt: now
			}))
		);

		if (validityRows.length > 0) {
			db.insert(curriculumValidityRules).values(validityRows).run();
			validityRuleCount += validityRows.length;
		}

		if (reviewStatus === 'review_needed') {
			reviewNeededCount += 1;
		}

		sourceCount += 1;
	}

	return { sourceCount, validityRuleCount, reviewNeededCount };
})(drafts);

console.log(
	`Imported ${counters.sourceCount} Thuringia curriculum sources and ${counters.validityRuleCount} validity rules (${counters.reviewNeededCount} sources need review).`
);

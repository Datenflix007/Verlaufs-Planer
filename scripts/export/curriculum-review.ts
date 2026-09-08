import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import { asc, desc } from 'drizzle-orm';

import { databaseUrl, db } from '../../src/lib/server/db';
import {
	competencies,
	curriculumSources,
	curriculumValidityRules
} from '../../src/lib/server/db/schema';
import {
	summarizeCurriculumWorkflow,
	type CurriculumWorkflowIssueType
} from '../../src/lib/shared/annotation/curriculum';

const defaultOutputPath = 'data/exports/curriculum-review.json';

function readOutputPath(argv: string[]) {
	const outputIndex = argv.findIndex((argument) => argument === '--output' || argument === '-o');
	const outputPath = outputIndex >= 0 ? argv[outputIndex + 1] : defaultOutputPath;

	if (!outputPath) {
		throw new Error('Missing output path after --output.');
	}

	return outputPath;
}

function increment(counts: Record<string, number>, key: string | null | undefined) {
	const normalizedKey = key ?? 'unknown';
	counts[normalizedKey] = (counts[normalizedKey] ?? 0) + 1;
}

function groupedBySourceId<T extends { curriculumSourceId: string }>(rows: T[]) {
	const grouped = new Map<string, T[]>();

	for (const row of rows) {
		grouped.set(row.curriculumSourceId, [...(grouped.get(row.curriculumSourceId) ?? []), row]);
	}

	return grouped;
}

const issueMetadata: Record<
	CurriculumWorkflowIssueType,
	{ severity: 'warning' | 'blocking'; message: string }
> = {
	review_needed: {
		severity: 'warning',
		message: 'Quelle braucht menschlichen Review.'
	},
	missing_validity_rules: {
		severity: 'blocking',
		message: 'Keine Gueltigkeitsregel fuer Schuljahr und Klassenstufe vorhanden.'
	},
	missing_context_validity: {
		severity: 'blocking',
		message:
			'Keine Gueltigkeitsregel fuer den angefragten Schuljahr-/Klassenstufen-Kontext vorhanden.'
	},
	missing_competencies: {
		severity: 'blocking',
		message: 'Keine Kompetenz- oder Lernzielannotation fuer die Planung vorhanden.'
	},
	competency_review_needed: {
		severity: 'warning',
		message: 'Kompetenzannotation ist vorhanden, aber noch nicht menschlich geprueft.'
	}
};

function buildOpenIssues(input: {
	id: string;
	schoolType: string;
	subject: string;
	title: string;
	issueTypes: CurriculumWorkflowIssueType[];
}) {
	const issues: Array<{
		type: CurriculumWorkflowIssueType;
		severity: 'warning' | 'blocking';
		sourceId: string;
		schoolType: string;
		subject: string;
		title: string;
		message: string;
	}> = [];

	for (const issueType of input.issueTypes) {
		const metadata = issueMetadata[issueType];

		issues.push({
			type: issueType,
			severity: metadata.severity,
			sourceId: input.id,
			schoolType: input.schoolType,
			subject: input.subject,
			title: input.title,
			message: metadata.message
		});
	}

	return issues;
}

const outputPath = readOutputPath(process.argv.slice(2));
const resolvedOutputPath = isAbsolute(outputPath) ? outputPath : resolve(process.cwd(), outputPath);
const exportedAt = new Date().toISOString();
const sources = db
	.select()
	.from(curriculumSources)
	.orderBy(
		asc(curriculumSources.schoolType),
		asc(curriculumSources.subject),
		desc(curriculumSources.year),
		asc(curriculumSources.title)
	)
	.all();
const validityRules = db
	.select()
	.from(curriculumValidityRules)
	.orderBy(
		asc(curriculumValidityRules.curriculumSourceId),
		asc(curriculumValidityRules.gradeLevel),
		asc(curriculumValidityRules.validFromSchoolYear),
		asc(curriculumValidityRules.origin)
	)
	.all();
const competencyRows = db
	.select()
	.from(competencies)
	.orderBy(
		asc(competencies.curriculumSourceId),
		asc(competencies.gradeFrom),
		asc(competencies.parentCompetencyId),
		asc(competencies.title)
	)
	.all();
const rulesBySource = groupedBySourceId(validityRules);
const competenciesBySource = groupedBySourceId(competencyRows);
const stats = {
	totalSources: sources.length,
	totalValidityRules: validityRules.length,
	totalCompetencies: competencyRows.length,
	sourcesWithValidityRules: 0,
	sourcesWithoutValidityRules: 0,
	sourcesWithCompetencies: 0,
	sourcesWithoutCompetencies: 0,
	sourcesWithHumanReviewedCompetencies: 0,
	sourcesWorkflowComplete: 0,
	sourcesWorkflowOpen: 0,
	byReviewStatus: {} as Record<string, number>,
	byVersionStatus: {} as Record<string, number>,
	rulesByOrigin: {} as Record<string, number>,
	rulesByConfidence: {} as Record<string, number>,
	rulesByType: {} as Record<string, number>,
	competenciesByAnnotationStatus: {} as Record<string, number>,
	workflowIssuesByType: {} as Record<string, number>
};
const openIssues: ReturnType<typeof buildOpenIssues> = [];
const exportedSources = sources.map((source) => {
	const sourceRules = rulesBySource.get(source.id) ?? [];
	const sourceCompetencies = competenciesBySource.get(source.id) ?? [];
	const manualRuleCount = sourceRules.filter((rule) => rule.origin === 'manual').length;
	const importedRuleCount = sourceRules.filter((rule) => rule.origin === 'imported').length;
	const draftCompetencyCount = sourceCompetencies.filter(
		(competency) => competency.annotationStatus === 'draft'
	).length;
	const machinePreparedCompetencyCount = sourceCompetencies.filter(
		(competency) => competency.annotationStatus === 'machine_prepared'
	).length;
	const humanReviewedCompetencyCount = sourceCompetencies.filter(
		(competency) => competency.annotationStatus === 'human_reviewed'
	).length;
	const workflow = summarizeCurriculumWorkflow({
		reviewStatus: source.reviewStatus,
		validityRuleCount: sourceRules.length,
		matchingValidityRuleCount: sourceRules.length,
		contextRequested: false,
		competencyCount: sourceCompetencies.length,
		humanReviewedCompetencyCount
	});
	const issues = buildOpenIssues({
		id: source.id,
		schoolType: source.schoolType,
		subject: source.subject,
		title: source.title,
		issueTypes: workflow.issues
	});

	increment(stats.byReviewStatus, source.reviewStatus);
	increment(stats.byVersionStatus, source.versionStatus);

	if (sourceRules.length > 0) {
		stats.sourcesWithValidityRules += 1;
	} else {
		stats.sourcesWithoutValidityRules += 1;
	}

	if (sourceCompetencies.length > 0) {
		stats.sourcesWithCompetencies += 1;
	} else {
		stats.sourcesWithoutCompetencies += 1;
	}

	if (humanReviewedCompetencyCount > 0) {
		stats.sourcesWithHumanReviewedCompetencies += 1;
	}

	if (workflow.complete) {
		stats.sourcesWorkflowComplete += 1;
	} else {
		stats.sourcesWorkflowOpen += 1;
	}

	for (const issue of workflow.issues) {
		increment(stats.workflowIssuesByType, issue);
	}

	openIssues.push(...issues);

	return {
		id: source.id,
		jurisdiction: source.jurisdiction,
		schoolType: source.schoolType,
		subject: source.subject,
		title: source.title,
		year: source.year,
		versionLabel: source.versionLabel,
		versionStatus: source.versionStatus,
		review: {
			status: source.reviewStatus,
			note: source.reviewNote,
			reviewedAt: source.reviewedAt
		},
		source: {
			url: source.sourceUrl,
			localPath: source.localPath,
			contentHash: source.contentHash,
			metadata: source.sourceMetadataJson
		},
		validity: {
			ruleCount: sourceRules.length,
			manualRuleCount,
			importedRuleCount,
			rules: sourceRules.map((rule) => ({
				id: rule.id,
				validFromSchoolYear: rule.validFromSchoolYear,
				validToSchoolYear: rule.validToSchoolYear,
				gradeLevel: rule.gradeLevel,
				ruleType: rule.ruleType,
				origin: rule.origin,
				confidence: rule.confidence,
				sourceText: rule.sourceText,
				note: rule.note
			}))
		},
		competencySummary: {
			totalCount: sourceCompetencies.length,
			draftCount: draftCompetencyCount,
			machinePreparedCount: machinePreparedCompetencyCount,
			humanReviewedCount: humanReviewedCompetencyCount
		},
		competencies: sourceCompetencies.map((competency) => ({
			id: competency.id,
			parentCompetencyId: competency.parentCompetencyId,
			code: competency.code,
			title: competency.title,
			description: competency.description,
			gradeFrom: competency.gradeFrom,
			gradeTo: competency.gradeTo,
			pageFrom: competency.pageFrom,
			pageTo: competency.pageTo,
			sourceQuote: competency.sourceQuote,
			annotationStatus: competency.annotationStatus,
			metadata: competency.metadataJson
		})),
		workflow,
		openIssues: issues
	};
});

for (const rule of validityRules) {
	increment(stats.rulesByOrigin, rule.origin);
	increment(stats.rulesByConfidence, rule.confidence);
	increment(stats.rulesByType, rule.ruleType);
}

for (const competency of competencyRows) {
	increment(stats.competenciesByAnnotationStatus, competency.annotationStatus);
}

const exportPayload = {
	schemaVersion: 'curriculum-review-export/v1',
	exportedAt,
	databaseUrl,
	stats,
	openIssues,
	sources: exportedSources
};

mkdirSync(dirname(resolvedOutputPath), { recursive: true });
writeFileSync(resolvedOutputPath, `${JSON.stringify(exportPayload, null, 2)}\n`, 'utf8');

console.log(
	`Exported ${sources.length} curriculum sources, ${validityRules.length} validity rules, ${competencyRows.length} competencies and ${openIssues.length} open issues to ${outputPath}.`
);

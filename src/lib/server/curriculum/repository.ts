import { asc, desc } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { curriculumSources, curriculumValidityRules } from '$lib/server/db/schema';

const reviewPriority = {
	review_needed: 0,
	unreviewed: 1,
	reviewed: 2
} as const;

export function getCurriculumReviewOverview(limit = 80) {
	const sources = db
		.select()
		.from(curriculumSources)
		.orderBy(
			asc(curriculumSources.reviewStatus),
			asc(curriculumSources.schoolType),
			asc(curriculumSources.subject),
			desc(curriculumSources.year)
		)
		.all();
	const validityRules = db.select().from(curriculumValidityRules).all();
	const ruleCounts = new Map<string, number>();

	for (const rule of validityRules) {
		ruleCounts.set(rule.curriculumSourceId, (ruleCounts.get(rule.curriculumSourceId) ?? 0) + 1);
	}

	const versionStatusCounts = new Map<string, number>();
	const reviewStatusCounts = new Map<string, number>();
	const schoolTypeCounts = new Map<string, number>();

	for (const source of sources) {
		versionStatusCounts.set(source.versionStatus, (versionStatusCounts.get(source.versionStatus) ?? 0) + 1);
		reviewStatusCounts.set(source.reviewStatus, (reviewStatusCounts.get(source.reviewStatus) ?? 0) + 1);
		schoolTypeCounts.set(source.schoolType, (schoolTypeCounts.get(source.schoolType) ?? 0) + 1);
	}

	const reviewQueue = sources
		.toSorted((left, right) => {
			const leftPriority = reviewPriority[left.reviewStatus as keyof typeof reviewPriority] ?? 3;
			const rightPriority = reviewPriority[right.reviewStatus as keyof typeof reviewPriority] ?? 3;

			return leftPriority - rightPriority || left.subject.localeCompare(right.subject, 'de');
		})
		.slice(0, limit)
		.map((source) => ({
			id: source.id,
			schoolType: source.schoolType,
			subject: source.subject,
			title: source.title,
			year: source.year,
			versionStatus: source.versionStatus,
			reviewStatus: source.reviewStatus,
			sourceUrl: source.sourceUrl,
			localPath: source.localPath,
			validityRuleCount: ruleCounts.get(source.id) ?? 0
		}));

	return {
		stats: {
			totalSources: sources.length,
			validityRules: validityRules.length,
			reviewNeeded: reviewStatusCounts.get('review_needed') ?? 0,
			unreviewed: reviewStatusCounts.get('unreviewed') ?? 0,
			reviewed: reviewStatusCounts.get('reviewed') ?? 0
		},
		versionStatusCounts: Object.fromEntries(versionStatusCounts.entries()),
		schoolTypeCounts: [...schoolTypeCounts.entries()]
			.toSorted((left, right) => right[1] - left[1])
			.map(([label, count]) => ({ label, count })),
		reviewQueue
	};
}

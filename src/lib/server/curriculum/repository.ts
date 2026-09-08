import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import {
	classCurriculumCoverageMarks,
	competencies,
	curriculumSources,
	curriculumValidityRules,
	lessonCompetencies
} from '$lib/server/db/schema';
import type {
	CompetencyAnnotationStatus,
	CurriculumReviewStatus,
	CurriculumVersionStatus,
	CurriculumWorkflowIssueType,
	ValidityConfidence,
	ValidityRuleType
} from '$lib/shared/annotation/curriculum';
import {
	schoolYearIsWithinRange,
	summarizeCurriculumWorkflow
} from '$lib/shared/annotation/curriculum';

export const reviewStatuses = ['review_needed', 'unreviewed', 'reviewed'] as const;
export const versionStatuses = ['active', 'trial', 'draft', 'expired', 'unknown'] as const;
export const validityRuleTypes = ['valid', 'effective', 'expired'] as const;
export const validityConfidences = ['low', 'medium', 'high'] as const;
export const competencyAnnotationStatuses = [
	'draft',
	'machine_prepared',
	'human_reviewed'
] as const;
export const validityStateFilters = [
	'without_rules',
	'with_rules',
	'matching_context',
	'context_mismatch'
] as const;
export const competencyStateFilters = [
	'without_competencies',
	'with_competencies',
	'needs_human_review',
	'human_reviewed'
] as const;
export const workflowStateFilters = [
	'open',
	'complete',
	'needs_source_review',
	'missing_validity',
	'missing_competencies',
	'needs_competency_review'
] as const;

type ReviewFilterValue = CurriculumReviewStatus | 'all';
type VersionFilterValue = CurriculumVersionStatus | 'all';
type ValidityStateFilterValue = (typeof validityStateFilters)[number] | 'all';
type CompetencyStateFilterValue = (typeof competencyStateFilters)[number] | 'all';
type WorkflowStateFilterValue = (typeof workflowStateFilters)[number] | 'all';
type CurriculumSourceRow = typeof curriculumSources.$inferSelect;
type CurriculumValidityRuleRow = typeof curriculumValidityRules.$inferSelect;
type CurriculumCompetencySummary = ReturnType<typeof summarizeCompetenciesForSource>;
type CurriculumWorkflowSummary = ReturnType<typeof summarizeCurriculumWorkflow>;

export interface CurriculumReviewFilters {
	q: string;
	schoolType: string;
	subject: string;
	reviewStatus: ReviewFilterValue;
	versionStatus: VersionFilterValue;
	gradeLevel: string;
	schoolYear: string;
	validityState: ValidityStateFilterValue;
	competencyState: CompetencyStateFilterValue;
	workflowState: WorkflowStateFilterValue;
}

const defaultFilters: CurriculumReviewFilters = {
	q: '',
	schoolType: 'all',
	subject: 'all',
	reviewStatus: 'all',
	versionStatus: 'all',
	gradeLevel: 'all',
	schoolYear: 'all',
	validityState: 'all',
	competencyState: 'all',
	workflowState: 'all'
};

const reviewPriority = {
	review_needed: 0,
	unreviewed: 1,
	reviewed: 2
} as const;

const workflowIssueLabels: Record<CurriculumWorkflowIssueType, string> = {
	review_needed: 'Quellenreview offen',
	missing_validity_rules: 'Gueltigkeitsregeln fehlen',
	missing_context_validity: 'Gueltigkeit fuer Kontext offen',
	missing_competencies: 'Kompetenzannotation fehlt',
	competency_review_needed: 'Kompetenzreview offen'
};

function isReviewStatus(value: string): value is CurriculumReviewStatus {
	return reviewStatuses.includes(value as CurriculumReviewStatus);
}

function isVersionStatus(value: string): value is CurriculumVersionStatus {
	return versionStatuses.includes(value as CurriculumVersionStatus);
}

function isValidityRuleType(value: string): value is ValidityRuleType {
	return validityRuleTypes.includes(value as ValidityRuleType);
}

function isValidityConfidence(value: string): value is ValidityConfidence {
	return validityConfidences.includes(value as ValidityConfidence);
}

function isCompetencyAnnotationStatus(value: string): value is CompetencyAnnotationStatus {
	return competencyAnnotationStatuses.includes(value as CompetencyAnnotationStatus);
}

function isValidityStateFilter(value: string): value is (typeof validityStateFilters)[number] {
	return validityStateFilters.includes(value as (typeof validityStateFilters)[number]);
}

function isCompetencyStateFilter(value: string): value is (typeof competencyStateFilters)[number] {
	return competencyStateFilters.includes(value as (typeof competencyStateFilters)[number]);
}

function isWorkflowStateFilter(value: string): value is (typeof workflowStateFilters)[number] {
	return workflowStateFilters.includes(value as (typeof workflowStateFilters)[number]);
}

function normalizeText(value: string) {
	return value.trim().toLowerCase();
}

function normalizeGradeLevelFilter(value: string | null) {
	if (!value || value === 'all') {
		return defaultFilters.gradeLevel;
	}

	const gradeLevel = Number.parseInt(value, 10);

	return Number.isInteger(gradeLevel) && gradeLevel >= 1 && gradeLevel <= 13
		? String(gradeLevel)
		: defaultFilters.gradeLevel;
}

function normalizeSchoolYearFilter(value: string | null) {
	const schoolYear = value?.trim() ?? '';

	if (!schoolYear || schoolYear === 'all') {
		return defaultFilters.schoolYear;
	}

	return /^20\d{2}\/\d{2}$/.test(schoolYear) ? schoolYear : defaultFilters.schoolYear;
}

function readFormText(value: FormDataEntryValue | null, maxLength: number) {
	if (typeof value !== 'string') {
		return '';
	}

	return value.trim().slice(0, maxLength);
}

function readRequiredFormText(value: FormDataEntryValue | null, label: string, maxLength: number) {
	const text = readFormText(value, maxLength);

	if (!text) {
		throw new Error(`${label} fehlt.`);
	}

	return text;
}

function readSchoolYear(value: FormDataEntryValue | null, label: string, required = false) {
	const schoolYear = readFormText(value, 20);

	if (!schoolYear) {
		if (required) {
			throw new Error(`${label} fehlt.`);
		}

		return null;
	}

	if (!/^20\d{2}\/\d{2}$/.test(schoolYear)) {
		throw new Error(`${label} muss dem Format 2026/27 folgen.`);
	}

	return schoolYear;
}

function readGradeLevel(value: FormDataEntryValue | null) {
	const gradeLevel = Number.parseInt(readFormText(value, 4), 10);

	if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 13) {
		throw new Error('Klassenstufe muss zwischen 1 und 13 liegen.');
	}

	return gradeLevel;
}

function readOptionalInteger(
	value: FormDataEntryValue | null,
	label: string,
	minimum: number,
	maximum: number
) {
	const text = readFormText(value, 8);

	if (!text) {
		return null;
	}

	if (!/^\d+$/.test(text)) {
		throw new Error(`${label} muss eine ganze Zahl sein.`);
	}

	const numericValue = Number.parseInt(text, 10);

	if (!Number.isInteger(numericValue) || numericValue < minimum || numericValue > maximum) {
		throw new Error(`${label} muss zwischen ${minimum} und ${maximum} liegen.`);
	}

	return numericValue;
}

function assertIntegerRange(from: number | null, to: number | null, label: string) {
	if (from !== null && to !== null && to < from) {
		throw new Error(`${label} bis darf nicht vor ${label} von liegen.`);
	}
}

function groupValidityRulesBySource(rules: CurriculumValidityRuleRow[]) {
	const groupedRules = new Map<string, CurriculumValidityRuleRow[]>();

	for (const rule of rules) {
		const sourceRules = groupedRules.get(rule.curriculumSourceId) ?? [];
		sourceRules.push(rule);
		groupedRules.set(rule.curriculumSourceId, sourceRules);
	}

	return groupedRules;
}

function groupCompetenciesBySource(
	rows: Array<{ curriculumSourceId: string; annotationStatus: CompetencyAnnotationStatus }>
) {
	const groupedRows = new Map<
		string,
		Array<{ curriculumSourceId: string; annotationStatus: CompetencyAnnotationStatus }>
	>();

	for (const row of rows) {
		const sourceRows = groupedRows.get(row.curriculumSourceId) ?? [];
		sourceRows.push(row);
		groupedRows.set(row.curriculumSourceId, sourceRows);
	}

	return groupedRows;
}

function summarizeValidityForSource(
	rules: CurriculumValidityRuleRow[],
	filters: CurriculumReviewFilters
) {
	const gradeLevel = filters.gradeLevel === 'all' ? null : Number.parseInt(filters.gradeLevel, 10);
	const schoolYear = filters.schoolYear === 'all' ? null : filters.schoolYear;
	const contextRequested = gradeLevel !== null || schoolYear !== null;
	const matchingRuleCount = rules.filter((rule) => {
		const gradeMatches = gradeLevel === null || rule.gradeLevel === gradeLevel;
		const schoolYearMatches =
			schoolYear === null ||
			schoolYearIsWithinRange(schoolYear, rule.validFromSchoolYear, rule.validToSchoolYear);

		return gradeMatches && schoolYearMatches;
	}).length;
	const manualRuleCount = rules.filter((rule) => rule.origin === 'manual').length;
	const importedRuleCount = rules.filter((rule) => rule.origin === 'imported').length;
	const status =
		rules.length === 0
			? 'without_rules'
			: contextRequested && matchingRuleCount > 0
				? 'matching_context'
				: contextRequested
					? 'context_mismatch'
					: 'with_rules';

	return {
		status,
		ruleCount: rules.length,
		manualRuleCount,
		importedRuleCount,
		matchingRuleCount,
		contextRequested
	};
}

function summarizeCompetenciesForSource(
	rows: Array<{ annotationStatus: CompetencyAnnotationStatus }>
) {
	const draftCount = rows.filter((row) => row.annotationStatus === 'draft').length;
	const machinePreparedCount = rows.filter(
		(row) => row.annotationStatus === 'machine_prepared'
	).length;
	const humanReviewedCount = rows.filter((row) => row.annotationStatus === 'human_reviewed').length;
	const status =
		rows.length === 0
			? 'without_competencies'
			: humanReviewedCount > 0
				? 'human_reviewed'
				: 'needs_human_review';

	return {
		status,
		totalCount: rows.length,
		draftCount,
		machinePreparedCount,
		humanReviewedCount
	};
}

function summarizeWorkflowForSource(
	source: CurriculumSourceRow,
	validitySummary: ReturnType<typeof summarizeValidityForSource>,
	competencySummary: CurriculumCompetencySummary
) {
	return summarizeCurriculumWorkflow({
		reviewStatus: source.reviewStatus,
		validityRuleCount: validitySummary.ruleCount,
		matchingValidityRuleCount: validitySummary.matchingRuleCount,
		contextRequested: validitySummary.contextRequested,
		competencyCount: competencySummary.totalCount,
		humanReviewedCompetencyCount: competencySummary.humanReviewedCount
	});
}

function matchesValidityState(
	summary: ReturnType<typeof summarizeValidityForSource>,
	filters: CurriculumReviewFilters
) {
	switch (filters.validityState) {
		case 'without_rules':
			return summary.ruleCount === 0;
		case 'with_rules':
			return summary.ruleCount > 0;
		case 'matching_context':
			return summary.contextRequested && summary.matchingRuleCount > 0;
		case 'context_mismatch':
			return summary.contextRequested && summary.ruleCount > 0 && summary.matchingRuleCount === 0;
		case 'all':
		default:
			return true;
	}
}

function matchesCompetencyStateValue(
	summary: CurriculumCompetencySummary,
	value: CompetencyStateFilterValue
) {
	switch (value) {
		case 'without_competencies':
			return summary.totalCount === 0;
		case 'with_competencies':
			return summary.totalCount > 0;
		case 'needs_human_review':
			return summary.totalCount > 0 && summary.humanReviewedCount === 0;
		case 'human_reviewed':
			return summary.humanReviewedCount > 0;
		case 'all':
		default:
			return true;
	}
}

function matchesWorkflowStateValue(
	summary: CurriculumWorkflowSummary,
	value: WorkflowStateFilterValue
) {
	switch (value) {
		case 'open':
			return !summary.complete;
		case 'complete':
			return summary.complete;
		case 'needs_source_review':
			return summary.issues.includes('review_needed');
		case 'missing_validity':
			return (
				summary.issues.includes('missing_validity_rules') ||
				summary.issues.includes('missing_context_validity')
			);
		case 'missing_competencies':
			return summary.issues.includes('missing_competencies');
		case 'needs_competency_review':
			return summary.issues.includes('competency_review_needed');
		case 'all':
		default:
			return true;
	}
}

function matchesFilter(
	source: CurriculumSourceRow,
	validitySummary: ReturnType<typeof summarizeValidityForSource>,
	competencySummary: CurriculumCompetencySummary,
	workflowSummary: CurriculumWorkflowSummary,
	filters: CurriculumReviewFilters
) {
	const query = normalizeText(filters.q);
	const searchableText = normalizeText(
		[source.subject, source.title, source.schoolType, source.localPath, source.sourceUrl]
			.filter(Boolean)
			.join(' ')
	);

	return (
		(query === '' || searchableText.includes(query)) &&
		(filters.schoolType === 'all' || source.schoolType === filters.schoolType) &&
		(filters.subject === 'all' || source.subject === filters.subject) &&
		(filters.reviewStatus === 'all' || source.reviewStatus === filters.reviewStatus) &&
		(filters.versionStatus === 'all' || source.versionStatus === filters.versionStatus) &&
		matchesValidityState(validitySummary, filters) &&
		matchesCompetencyStateValue(competencySummary, filters.competencyState) &&
		matchesWorkflowStateValue(workflowSummary, filters.workflowState)
	);
}

function countBy(values: string[]) {
	const counts = new Map<string, number>();

	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}

	return counts;
}

function toOptions(counts: Map<string, number>) {
	return [...counts.entries()]
		.toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'de'))
		.map(([label, count]) => ({ label, count }));
}

function sortReviewSources(
	left: CurriculumSourceRow,
	right: CurriculumSourceRow,
	workflowSummaries: Map<string, CurriculumWorkflowSummary>
) {
	const leftComplete = workflowSummaries.get(left.id)?.complete ? 1 : 0;
	const rightComplete = workflowSummaries.get(right.id)?.complete ? 1 : 0;
	const leftPriority = reviewPriority[left.reviewStatus as keyof typeof reviewPriority] ?? 3;
	const rightPriority = reviewPriority[right.reviewStatus as keyof typeof reviewPriority] ?? 3;

	return (
		leftComplete - rightComplete ||
		leftPriority - rightPriority ||
		left.subject.localeCompare(right.subject, 'de') ||
		left.title.localeCompare(right.title, 'de')
	);
}

function toReviewQueueEntry(
	source: CurriculumSourceRow,
	validitySummary: ReturnType<typeof summarizeValidityForSource>,
	competencySummary: CurriculumCompetencySummary,
	workflowSummary: CurriculumWorkflowSummary
) {
	return {
		id: source.id,
		schoolType: source.schoolType,
		subject: source.subject,
		title: source.title,
		year: source.year,
		versionStatus: source.versionStatus,
		reviewStatus: source.reviewStatus,
		reviewNote: source.reviewNote,
		reviewedAt: source.reviewedAt,
		sourceUrl: source.sourceUrl,
		localPath: source.localPath,
		validityRuleCount: validitySummary.ruleCount,
		manualValidityRuleCount: validitySummary.manualRuleCount,
		importedValidityRuleCount: validitySummary.importedRuleCount,
		matchingValidityRuleCount: validitySummary.matchingRuleCount,
		validityContextStatus: validitySummary.status,
		competencyCount: competencySummary.totalCount,
		humanReviewedCompetencyCount: competencySummary.humanReviewedCount,
		competencyContextStatus: competencySummary.status,
		workflowComplete: workflowSummary.complete,
		workflowIssues: workflowSummary.issues
	};
}

function getFilteredReviewQueue(filters: CurriculumReviewFilters) {
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
	const competencyRows = db
		.select({
			curriculumSourceId: competencies.curriculumSourceId,
			annotationStatus: competencies.annotationStatus
		})
		.from(competencies)
		.all();
	const validityRulesBySource = groupValidityRulesBySource(validityRules);
	const competenciesBySource = groupCompetenciesBySource(competencyRows);
	const validitySummaries = new Map(
		sources.map((source) => [
			source.id,
			summarizeValidityForSource(validityRulesBySource.get(source.id) ?? [], filters)
		])
	);
	const competencySummaries = new Map(
		sources.map((source) => [
			source.id,
			summarizeCompetenciesForSource(competenciesBySource.get(source.id) ?? [])
		])
	);
	const workflowSummaries = new Map(
		sources.map((source) => [
			source.id,
			summarizeWorkflowForSource(
				source,
				validitySummaries.get(source.id)!,
				competencySummaries.get(source.id)!
			)
		])
	);
	const filteredSources = sources
		.filter((source) =>
			matchesFilter(
				source,
				validitySummaries.get(source.id)!,
				competencySummaries.get(source.id)!,
				workflowSummaries.get(source.id)!,
				filters
			)
		)
		.toSorted((left, right) => sortReviewSources(left, right, workflowSummaries));

	return {
		sources,
		validityRules,
		competencyRows,
		validitySummaries,
		competencySummaries,
		workflowSummaries,
		filteredSources
	};
}

function compactNavigationSource(
	source: CurriculumSourceRow,
	validitySummary: ReturnType<typeof summarizeValidityForSource>,
	competencySummary: CurriculumCompetencySummary,
	workflowSummary: CurriculumWorkflowSummary
) {
	return {
		id: source.id,
		subject: source.subject,
		title: source.title,
		reviewStatus: source.reviewStatus,
		validityContextStatus: validitySummary.status,
		competencyCount: competencySummary.totalCount,
		workflowComplete: workflowSummary.complete,
		workflowIssues: workflowSummary.issues
	};
}

export function buildCurriculumReviewFilterQuery(filters: CurriculumReviewFilters) {
	const searchParams = new URLSearchParams();

	if (filters.q) {
		searchParams.set('q', filters.q);
	}

	for (const key of ['schoolType', 'subject', 'reviewStatus', 'versionStatus'] as const) {
		if (filters[key] !== 'all') {
			searchParams.set(key, filters[key]);
		}
	}

	if (filters.gradeLevel !== 'all') {
		searchParams.set('gradeLevel', filters.gradeLevel);
	}

	if (filters.schoolYear !== 'all') {
		searchParams.set('schoolYear', filters.schoolYear);
	}

	if (filters.validityState !== 'all') {
		searchParams.set('validityState', filters.validityState);
	}

	if (filters.competencyState !== 'all') {
		searchParams.set('competencyState', filters.competencyState);
	}

	if (filters.workflowState !== 'all') {
		searchParams.set('workflowState', filters.workflowState);
	}

	return searchParams.toString();
}

export function getCurriculumReviewNavigation(
	currentSourceId: string,
	filters: CurriculumReviewFilters
) {
	const { filteredSources, validitySummaries, competencySummaries, workflowSummaries } =
		getFilteredReviewQueue(filters);
	const currentIndex = filteredSources.findIndex((source) => source.id === currentSourceId);
	const sourceAt = (index: number) => {
		const source = filteredSources[index];

		return source
			? compactNavigationSource(
					source,
					validitySummaries.get(source.id)!,
					competencySummaries.get(source.id)!,
					workflowSummaries.get(source.id)!
				)
			: null;
	};
	const nextOpenSource =
		filteredSources.find(
			(source, index) =>
				index > currentIndex &&
				source.id !== currentSourceId &&
				!workflowSummaries.get(source.id)!.complete
		) ??
		filteredSources.find(
			(source) => source.id !== currentSourceId && !workflowSummaries.get(source.id)!.complete
		) ??
		null;

	return {
		position: currentIndex >= 0 ? currentIndex + 1 : null,
		total: filteredSources.length,
		previous: currentIndex > 0 ? sourceAt(currentIndex - 1) : null,
		next: currentIndex >= 0 ? sourceAt(currentIndex + 1) : sourceAt(0),
		nextOpen: nextOpenSource
			? compactNavigationSource(
					nextOpenSource,
					validitySummaries.get(nextOpenSource.id)!,
					competencySummaries.get(nextOpenSource.id)!,
					workflowSummaries.get(nextOpenSource.id)!
				)
			: null,
		currentInQueue: currentIndex >= 0
	};
}

export function readCurriculumReviewFilters(
	searchParams: URLSearchParams
): CurriculumReviewFilters {
	const reviewStatus = searchParams.get('reviewStatus') ?? defaultFilters.reviewStatus;
	const versionStatus = searchParams.get('versionStatus') ?? defaultFilters.versionStatus;
	const validityState = searchParams.get('validityState') ?? defaultFilters.validityState;
	const competencyState = searchParams.get('competencyState') ?? defaultFilters.competencyState;
	const workflowState = searchParams.get('workflowState') ?? defaultFilters.workflowState;

	return {
		q: searchParams.get('q')?.trim() ?? defaultFilters.q,
		schoolType: searchParams.get('schoolType') ?? defaultFilters.schoolType,
		subject: searchParams.get('subject') ?? defaultFilters.subject,
		reviewStatus:
			reviewStatus === 'all' || isReviewStatus(reviewStatus)
				? reviewStatus
				: defaultFilters.reviewStatus,
		versionStatus:
			versionStatus === 'all' || isVersionStatus(versionStatus)
				? versionStatus
				: defaultFilters.versionStatus,
		gradeLevel: normalizeGradeLevelFilter(searchParams.get('gradeLevel')),
		schoolYear: normalizeSchoolYearFilter(searchParams.get('schoolYear')),
		validityState:
			validityState === 'all' || isValidityStateFilter(validityState)
				? validityState
				: defaultFilters.validityState,
		competencyState:
			competencyState === 'all' || isCompetencyStateFilter(competencyState)
				? competencyState
				: defaultFilters.competencyState,
		workflowState:
			workflowState === 'all' || isWorkflowStateFilter(workflowState)
				? workflowState
				: defaultFilters.workflowState
	};
}

export function updateCurriculumSourceReview(input: {
	id: string;
	reviewStatus: CurriculumReviewStatus;
	reviewNote: string;
}) {
	const now = new Date().toISOString();
	const result = db
		.update(curriculumSources)
		.set({
			reviewStatus: input.reviewStatus,
			reviewNote: input.reviewNote.trim() || null,
			reviewedAt: input.reviewStatus === 'reviewed' ? now : null,
			updatedAt: now
		})
		.where(eq(curriculumSources.id, input.id))
		.run();

	return result.changes > 0;
}

export function assertCurriculumReviewStatus(value: FormDataEntryValue | null) {
	const status = String(value ?? '');

	if (!isReviewStatus(status)) {
		throw new Error('Ungueltiger Reviewstatus.');
	}

	return status;
}

export function assertValidityRuleType(value: FormDataEntryValue | null) {
	const ruleType = readFormText(value, 40);

	if (!isValidityRuleType(ruleType)) {
		throw new Error('Ungueltiger Gueltigkeitstyp.');
	}

	return ruleType;
}

export function assertValidityConfidence(value: FormDataEntryValue | null) {
	const confidence = readFormText(value, 40);

	if (!isValidityConfidence(confidence)) {
		throw new Error('Ungueltige Sicherheit.');
	}

	return confidence;
}

export function assertCompetencyAnnotationStatus(value: FormDataEntryValue | null) {
	const status = readFormText(value, 40);

	if (!isCompetencyAnnotationStatus(status)) {
		throw new Error('Ungueltiger Annotationsstatus.');
	}

	return status;
}

export function readCurriculumValidityRuleFormData(formData: FormData) {
	return {
		validFromSchoolYear: readSchoolYear(formData.get('validFromSchoolYear'), 'Schuljahr ab', true),
		validToSchoolYear: readSchoolYear(formData.get('validToSchoolYear'), 'Schuljahr bis'),
		gradeLevel: readGradeLevel(formData.get('gradeLevel')),
		ruleType: assertValidityRuleType(formData.get('ruleType')),
		confidence: assertValidityConfidence(formData.get('confidence')),
		sourceText: readRequiredFormText(formData.get('sourceText'), 'Fundstelle', 4000),
		note: readFormText(formData.get('note'), 4000) || null
	};
}

export function readCurriculumCompetencyFormData(formData: FormData) {
	const gradeFrom = readOptionalInteger(formData.get('gradeFrom'), 'Klassenstufe von', 1, 13);
	const gradeTo = readOptionalInteger(formData.get('gradeTo'), 'Klassenstufe bis', 1, 13);
	const pageFrom = readOptionalInteger(formData.get('pageFrom'), 'Seite von', 1, 5000);
	const pageTo = readOptionalInteger(formData.get('pageTo'), 'Seite bis', 1, 5000);

	assertIntegerRange(gradeFrom, gradeTo, 'Klassenstufe');
	assertIntegerRange(pageFrom, pageTo, 'Seite');

	return {
		parentCompetencyId: readFormText(formData.get('parentCompetencyId'), 80) || null,
		code: readFormText(formData.get('code'), 120) || null,
		title: readRequiredFormText(formData.get('title'), 'Titel', 500),
		description: readFormText(formData.get('description'), 4000) || null,
		gradeFrom,
		gradeTo,
		pageFrom,
		pageTo,
		sourceQuote: readFormText(formData.get('sourceQuote'), 4000) || null,
		annotationStatus: assertCompetencyAnnotationStatus(formData.get('annotationStatus')),
		metadata: {
			origin: 'manual_review_form'
		}
	};
}

export function createCurriculumValidityRule(
	input: ReturnType<typeof readCurriculumValidityRuleFormData> & {
		curriculumSourceId: string;
	}
) {
	const now = new Date().toISOString();

	return db.transaction((tx) => {
		const source = tx
			.select({ id: curriculumSources.id })
			.from(curriculumSources)
			.where(eq(curriculumSources.id, input.curriculumSourceId))
			.get();

		if (!source) {
			return null;
		}

		const id = randomUUID();

		tx.insert(curriculumValidityRules)
			.values({
				id,
				curriculumSourceId: input.curriculumSourceId,
				validFromSchoolYear: input.validFromSchoolYear,
				validToSchoolYear: input.validToSchoolYear,
				gradeLevel: input.gradeLevel,
				ruleType: input.ruleType,
				note: input.note,
				sourceText: input.sourceText,
				origin: 'manual',
				confidence: input.confidence,
				createdAt: now,
				updatedAt: now
			})
			.run();

		tx.update(curriculumSources)
			.set({ updatedAt: now })
			.where(eq(curriculumSources.id, input.curriculumSourceId))
			.run();

		return id;
	});
}

export function createCurriculumCompetencyAnnotation(
	input: ReturnType<typeof readCurriculumCompetencyFormData> & {
		curriculumSourceId: string;
	}
) {
	const now = new Date().toISOString();

	return db.transaction((tx) => {
		const source = tx
			.select({ id: curriculumSources.id })
			.from(curriculumSources)
			.where(eq(curriculumSources.id, input.curriculumSourceId))
			.get();

		if (!source) {
			return null;
		}

		if (input.parentCompetencyId) {
			const parent = tx
				.select({ id: competencies.id })
				.from(competencies)
				.where(
					and(
						eq(competencies.id, input.parentCompetencyId),
						eq(competencies.curriculumSourceId, input.curriculumSourceId)
					)
				)
				.get();

			if (!parent) {
				throw new Error('Uebergeordnete Kompetenz gehoert nicht zu dieser Lehrplanquelle.');
			}
		}

		const id = randomUUID();

		tx.insert(competencies)
			.values({
				id,
				curriculumSourceId: input.curriculumSourceId,
				parentCompetencyId: input.parentCompetencyId,
				code: input.code,
				title: input.title,
				description: input.description,
				gradeFrom: input.gradeFrom,
				gradeTo: input.gradeTo,
				pageFrom: input.pageFrom,
				pageTo: input.pageTo,
				sourceQuote: input.sourceQuote,
				annotationStatus: input.annotationStatus,
				metadataJson: input.metadata,
				createdAt: now,
				updatedAt: now
			})
			.run();

		tx.update(curriculumSources)
			.set({ updatedAt: now })
			.where(eq(curriculumSources.id, input.curriculumSourceId))
			.run();

		return id;
	});
}

export function deleteCurriculumCompetencyAnnotation(input: {
	curriculumSourceId: string;
	competencyId: string;
}) {
	const now = new Date().toISOString();

	return db.transaction((tx) => {
		const linkedLesson = tx
			.select({ id: lessonCompetencies.id })
			.from(lessonCompetencies)
			.where(eq(lessonCompetencies.competencyId, input.competencyId))
			.get();
		const linkedCoverage = tx
			.select({ id: classCurriculumCoverageMarks.id })
			.from(classCurriculumCoverageMarks)
			.where(eq(classCurriculumCoverageMarks.competencyId, input.competencyId))
			.get();

		if (linkedLesson || linkedCoverage) {
			return 'in_use' as const;
		}

		const result = tx
			.delete(competencies)
			.where(
				and(
					eq(competencies.id, input.competencyId),
					eq(competencies.curriculumSourceId, input.curriculumSourceId)
				)
			)
			.run();

		if (result.changes === 0) {
			return 'not_found' as const;
		}

		tx.update(curriculumSources)
			.set({ updatedAt: now })
			.where(eq(curriculumSources.id, input.curriculumSourceId))
			.run();

		return 'deleted' as const;
	});
}

export function deleteManualCurriculumValidityRule(input: {
	curriculumSourceId: string;
	validityRuleId: string;
}) {
	const now = new Date().toISOString();

	return db.transaction((tx) => {
		const result = tx
			.delete(curriculumValidityRules)
			.where(
				and(
					eq(curriculumValidityRules.id, input.validityRuleId),
					eq(curriculumValidityRules.curriculumSourceId, input.curriculumSourceId),
					eq(curriculumValidityRules.origin, 'manual')
				)
			)
			.run();

		if (result.changes === 0) {
			return false;
		}

		tx.update(curriculumSources)
			.set({ updatedAt: now })
			.where(eq(curriculumSources.id, input.curriculumSourceId))
			.run();

		return true;
	});
}

export function getCurriculumSourceReviewDetail(
	id: string,
	filters: CurriculumReviewFilters = defaultFilters
) {
	const source = db.select().from(curriculumSources).where(eq(curriculumSources.id, id)).get();

	if (!source) {
		return null;
	}

	const validityRules = db
		.select()
		.from(curriculumValidityRules)
		.where(eq(curriculumValidityRules.curriculumSourceId, id))
		.orderBy(
			asc(curriculumValidityRules.validFromSchoolYear),
			asc(curriculumValidityRules.gradeLevel),
			asc(curriculumValidityRules.origin)
		)
		.all();
	const competencyAnnotations = db
		.select()
		.from(competencies)
		.where(eq(competencies.curriculumSourceId, id))
		.orderBy(
			asc(competencies.gradeFrom),
			asc(competencies.parentCompetencyId),
			asc(competencies.title)
		)
		.all();
	const validitySummary = summarizeValidityForSource(validityRules, filters);
	const competencySummary = summarizeCompetenciesForSource(competencyAnnotations);
	const workflowSummary = summarizeWorkflowForSource(source, validitySummary, competencySummary);

	return {
		...source,
		sourceMetadata: source.sourceMetadataJson,
		validityRules,
		competencies: competencyAnnotations,
		competencySummary,
		workflowComplete: workflowSummary.complete,
		workflowIssues: workflowSummary.issues,
		workflowIssueLabels: workflowSummary.issues.map((issue) => workflowIssueLabels[issue]),
		validityContextStatus: validitySummary.status,
		matchingValidityRuleCount: validitySummary.matchingRuleCount,
		manualValidityRuleCount: validitySummary.manualRuleCount,
		importedValidityRuleCount: validitySummary.importedRuleCount
	};
}

export function getCurriculumReviewOverview(filters: CurriculumReviewFilters, limit = 80) {
	const {
		sources,
		validityRules,
		competencyRows,
		validitySummaries,
		competencySummaries,
		workflowSummaries,
		filteredSources
	} = getFilteredReviewQueue(filters);

	const versionStatusCounts = countBy(sources.map((source) => source.versionStatus));
	const reviewStatusCounts = countBy(sources.map((source) => source.reviewStatus));
	const schoolTypeCounts = countBy(sources.map((source) => source.schoolType));
	const subjectCounts = countBy(sources.map((source) => source.subject));
	const competencyStatusCounts = countBy(
		competencyRows.map((competency) => competency.annotationStatus)
	);
	const validityStatusCounts = countBy(
		[...validitySummaries.values()].map((summary) => summary.status)
	);
	const competencyStateCounts = new Map(
		competencyStateFilters.map((state) => [
			state,
			sources.filter((source) =>
				matchesCompetencyStateValue(competencySummaries.get(source.id)!, state)
			).length
		])
	);
	const workflowIssueCounts = countBy(
		[...workflowSummaries.values()].flatMap((summary) => summary.issues)
	);
	const workflowCompleteCount = [...workflowSummaries.values()].filter(
		(summary) => summary.complete
	).length;
	const sourcesWithValidityRules = [...validitySummaries.values()].filter(
		(summary) => summary.ruleCount > 0
	).length;
	const sourcesWithoutValidityRules = [...validitySummaries.values()].filter(
		(summary) => summary.ruleCount === 0
	).length;
	const sourcesWithCompetencies = [...competencySummaries.values()].filter(
		(summary) => summary.totalCount > 0
	).length;
	const sourcesWithHumanReviewedCompetencies = [...competencySummaries.values()].filter(
		(summary) => summary.humanReviewedCount > 0
	).length;
	const contextMatchCount = [...validitySummaries.values()].filter(
		(summary) => summary.contextRequested && summary.matchingRuleCount > 0
	).length;
	const contextMismatchCount = [...validitySummaries.values()].filter(
		(summary) =>
			summary.contextRequested && summary.ruleCount > 0 && summary.matchingRuleCount === 0
	).length;

	const reviewQueue = filteredSources.slice(0, limit).map((source) => ({
		...toReviewQueueEntry(
			source,
			validitySummaries.get(source.id)!,
			competencySummaries.get(source.id)!,
			workflowSummaries.get(source.id)!
		),
		workflowIssueLabels: workflowSummaries
			.get(source.id)!
			.issues.map((issue) => workflowIssueLabels[issue])
	}));

	return {
		filters,
		filterQuery: buildCurriculumReviewFilterQuery(filters),
		filterOptions: {
			schoolTypes: toOptions(schoolTypeCounts),
			subjects: toOptions(subjectCounts),
			reviewStatuses: toOptions(reviewStatusCounts),
			versionStatuses: toOptions(versionStatusCounts),
			gradeLevels: Array.from({ length: 13 }, (_, index) => ({
				label: String(index + 1),
				count: validityRules.filter((rule) => rule.gradeLevel === index + 1).length
			})),
			validityStates: validityStateFilters.map((label) => ({
				label,
				count: validityStatusCounts.get(label) ?? 0
			})),
			competencyStates: competencyStateFilters.map((label) => ({
				label,
				count: competencyStateCounts.get(label) ?? 0
			})),
			workflowStates: workflowStateFilters.map((label) => ({
				label,
				count:
					label === 'open'
						? sources.length - workflowCompleteCount
						: label === 'complete'
							? workflowCompleteCount
							: label === 'needs_source_review'
								? (workflowIssueCounts.get('review_needed') ?? 0)
								: label === 'missing_validity'
									? (workflowIssueCounts.get('missing_validity_rules') ?? 0) +
										(workflowIssueCounts.get('missing_context_validity') ?? 0)
									: label === 'missing_competencies'
										? (workflowIssueCounts.get('missing_competencies') ?? 0)
										: (workflowIssueCounts.get('competency_review_needed') ?? 0)
			}))
		},
		stats: {
			totalSources: sources.length,
			filteredSources: filteredSources.length,
			validityRules: validityRules.length,
			sourcesWithValidityRules,
			sourcesWithoutValidityRules,
			contextMatches: contextMatchCount,
			contextMismatches: contextMismatchCount,
			competencies: competencyRows.length,
			sourcesWithCompetencies,
			sourcesWithoutCompetencies: sources.length - sourcesWithCompetencies,
			sourcesWithHumanReviewedCompetencies,
			workflowComplete: workflowCompleteCount,
			workflowOpen: sources.length - workflowCompleteCount,
			reviewNeeded: reviewStatusCounts.get('review_needed') ?? 0,
			unreviewed: reviewStatusCounts.get('unreviewed') ?? 0,
			reviewed: reviewStatusCounts.get('reviewed') ?? 0
		},
		competencyStatusCounts: Object.fromEntries(competencyStatusCounts.entries()),
		workflowIssueCounts: Object.fromEntries(workflowIssueCounts.entries()),
		versionStatusCounts: Object.fromEntries(versionStatusCounts.entries()),
		schoolTypeCounts: toOptions(schoolTypeCounts),
		reviewQueue
	};
}

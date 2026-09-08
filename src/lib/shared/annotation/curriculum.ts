export type CurriculumJurisdiction = 'TH';

export type CurriculumVersionStatus = 'active' | 'trial' | 'draft' | 'expired' | 'unknown';

export type CurriculumReviewStatus = 'unreviewed' | 'review_needed' | 'reviewed';

export type ValidityRuleType = 'valid' | 'effective' | 'expired';

export type CoverageLevel = 'introduced' | 'practiced' | 'secured' | 'assessed';

export interface CurriculumValidityRuleDraft {
	ruleType: ValidityRuleType;
	schoolYear: string;
	gradeLevels: number[];
	sourceText: string;
	confidence: 'low' | 'medium' | 'high';
}

export interface CurriculumSourceAnnotationDraft {
	jurisdiction: CurriculumJurisdiction;
	schoolType: string;
	subject: string;
	title: string;
	year: number | null;
	versionLabel: string | null;
	versionStatus: CurriculumVersionStatus;
	sourceUrl: string;
	localPath: string | null;
	reviewStatus: CurriculumReviewStatus;
	validityRules: CurriculumValidityRuleDraft[];
	sourceMetadata: Record<string, unknown>;
}

export interface CompetencyAnnotationDraft {
	curriculumSourceId: string;
	parentCompetencyId: string | null;
	code: string | null;
	title: string;
	description: string | null;
	gradeFrom: number | null;
	gradeTo: number | null;
	pageFrom: number | null;
	pageTo: number | null;
	sourceQuote: string | null;
	annotationStatus: 'draft' | 'machine_prepared' | 'human_reviewed';
	metadata: Record<string, unknown>;
}

export interface ClassCoverageAnnotationDraft {
	classSubjectAllocationId: string;
	competencyId: string;
	lessonIds: string[];
	totalMinutes: number;
	coverageLevel: CoverageLevel;
	weeklyLessons: number;
	weekRange: {
		from: number | null;
		to: number | null;
	};
	hoverSummary: {
		label: string;
		lessonCount: number;
		totalHours: number;
		learningGoals: string[];
	};
	manualNote: string | null;
}

const schoolYearPattern = /\b(20\d{2})\/(\d{2})\b/g;
const gradeListPattern = /Klassenstuf(?:e|en)\s+([0-9,/\sund]+)/giu;

export function normalizeWhitespace(value: string) {
	return value.replace(/\s+/g, ' ').trim();
}

export function parseYearFromLabel(label: string): number | null {
	const match = label.match(/\b(20\d{2}|19\d{2})\b/);
	return match ? Number(match[1]) : null;
}

export function detectVersionStatus(label: string, sourceText = ''): CurriculumVersionStatus {
	const normalized = `${label} ${sourceText}`.toLowerCase();

	if (/(entwurfsfassung|entwurf)/i.test(normalized)) {
		return 'draft';
	}

	if (/(erprobungsfassung|erprobung)/i.test(normalized)) {
		return 'trial';
	}

	if (/(auslaufend|gueltigkeit endet|g\u00fcltigkeit endet)/i.test(normalized)) {
		return 'expired';
	}

	if (parseYearFromLabel(label)) {
		return 'active';
	}

	return 'unknown';
}

export function parseGradeLevels(value: string): number[] {
	const grades = new Set<number>();
	const matches = value.matchAll(/\b([1-9]|1[0-3])\b/g);

	for (const match of matches) {
		grades.add(Number(match[1]));
	}

	return [...grades].sort((a, b) => a - b);
}

export function extractValidityRulesFromText(sourceText: string): CurriculumValidityRuleDraft[] {
	const text = normalizeWhitespace(sourceText);
	const rules: CurriculumValidityRuleDraft[] = [];
	const schoolYears = [...text.matchAll(schoolYearPattern)];
	const gradeMatches = [...text.matchAll(gradeListPattern)];

	for (let index = 0; index < schoolYears.length; index += 1) {
		const schoolYear = `${schoolYears[index][1]}/${schoolYears[index][2]}`;
		const nearestGrades = gradeMatches.find(
			(gradeMatch) => gradeMatch.index >= schoolYears[index].index
		);
		const gradeLevels = nearestGrades ? parseGradeLevels(nearestGrades[1]) : [];

		if (gradeLevels.length === 0) {
			continue;
		}

		const prefix = text.slice(Math.max(0, schoolYears[index].index - 80), schoolYears[index].index);
		const ruleType: ValidityRuleType = /inkraftsetzung/i.test(prefix) ? 'effective' : 'valid';
		const sourceSlice = text.slice(schoolYears[index].index, schoolYears[index].index + 140);

		rules.push({
			ruleType,
			schoolYear,
			gradeLevels,
			sourceText: normalizeWhitespace(sourceSlice),
			confidence: 'medium'
		});
	}

	return rules;
}

export function createCurriculumSourceAnnotationDraft(input: {
	schoolType: string;
	subject: string;
	title: string;
	sourceUrl: string;
	localPath?: string | null;
	validityText?: string;
	metadata?: Record<string, unknown>;
}): CurriculumSourceAnnotationDraft {
	const validityText = input.validityText ?? '';
	const versionStatus = detectVersionStatus(input.title, validityText);
	const validityRules = extractValidityRulesFromText(validityText);

	return {
		jurisdiction: 'TH',
		schoolType: input.schoolType,
		subject: input.subject,
		title: input.title,
		year: parseYearFromLabel(input.title),
		versionLabel: input.title,
		versionStatus,
		sourceUrl: input.sourceUrl,
		localPath: input.localPath ?? null,
		reviewStatus: validityRules.length > 0 ? 'unreviewed' : 'review_needed',
		validityRules,
		sourceMetadata: input.metadata ?? {}
	};
}

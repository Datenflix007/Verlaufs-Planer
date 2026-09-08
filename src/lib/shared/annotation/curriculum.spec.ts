import { describe, expect, it } from 'vitest';

import {
	createCurriculumSourceAnnotationDraft,
	detectVersionStatus,
	extractValidityRulesFromText,
	parseGradeLevels,
	parseYearFromLabel
} from './curriculum';

describe('curriculum annotation helpers', () => {
	it('detects the status from the Lehrplan label', () => {
		expect(detectVersionStatus('Deutsch (Erprobungsfassung 2026)')).toBe('trial');
		expect(detectVersionStatus('Spanisch (Entwurfsfassung 2025)')).toBe('draft');
		expect(detectVersionStatus('Geschichte (2011)')).toBe('active');
		expect(detectVersionStatus('Unklare Quelle')).toBe('unknown');
	});

	it('extracts the publication year from a label', () => {
		expect(parseYearFromLabel('Franzoesisch (2024)')).toBe(2024);
		expect(parseYearFromLabel('Fach ohne Jahresangabe')).toBeNull();
	});

	it('parses grade lists from validity text', () => {
		expect(parseGradeLevels('fuer die Klassenstufen 5, 7, 11 und 12')).toEqual([5, 7, 11, 12]);
		expect(parseGradeLevels('fuer die Klassenstufe 10')).toEqual([10]);
		expect(parseGradeLevels('fuer die Klassenstufen 12/13')).toEqual([12, 13]);
	});

	it('turns Schulportal validity notes into reusable rule drafts', () => {
		const rules = extractValidityRulesFromText(
			'im Schuljahr 2026/27 fuer die Klassenstufen 6, 8, 9, 10; im Schuljahr 2027/28 fuer die Klassenstufen 9 und 10'
		);

		expect(rules).toMatchObject([
			{ ruleType: 'valid', schoolYear: '2026/27', gradeLevels: [6, 8, 9, 10] },
			{ ruleType: 'valid', schoolYear: '2027/28', gradeLevels: [9, 10] }
		]);
	});

	it('marks unclear validity as review-needed instead of pretending certainty', () => {
		const draft = createCurriculumSourceAnnotationDraft({
			schoolType: 'Gymnasium',
			subject: 'Deutsch',
			title: 'Deutsch (Erprobungsfassung 2026)',
			sourceUrl: 'https://example.test/deutsch.pdf',
			localPath: 'rawData/flp_th/Gymnasium/Deutsch/Deutsch.pdf'
		});

		expect(draft).toMatchObject({
			jurisdiction: 'TH',
			versionStatus: 'trial',
			reviewStatus: 'review_needed',
			validityRules: []
		});
	});
});

import { error, fail, redirect } from '@sveltejs/kit';

import {
	assertCurriculumReviewStatus,
	buildCurriculumReviewFilterQuery,
	createCurriculumCompetencyAnnotation,
	createCurriculumValidityRule,
	deleteCurriculumCompetencyAnnotation,
	deleteManualCurriculumValidityRule,
	getCurriculumReviewNavigation,
	getCurriculumSourceReviewDetail,
	readCurriculumCompetencyFormData,
	readCurriculumReviewFilters,
	readCurriculumValidityRuleFormData,
	updateCurriculumSourceReview
} from '$lib/server/curriculum/repository';

import type { Actions, PageServerLoad } from './$types';

function withFilterQuery(path: string, filterQuery: string) {
	return `${path}${filterQuery ? `?${filterQuery}` : ''}`;
}

export const load: PageServerLoad = ({ params, url }) => {
	const filters = readCurriculumReviewFilters(url.searchParams);
	const source = getCurriculumSourceReviewDetail(params.id, filters);

	if (!source) {
		error(404, 'Lehrplanquelle nicht gefunden.');
	}

	const filterQuery = buildCurriculumReviewFilterQuery(filters);
	const navigation = getCurriculumReviewNavigation(params.id, filters);

	return { source, filters, filterQuery, navigation };
};

export const actions: Actions = {
	review: async ({ request, params, url }) => {
		const formData = await request.formData();
		let reviewStatus;

		try {
			reviewStatus = assertCurriculumReviewStatus(formData.get('reviewStatus'));
		} catch (statusError) {
			return fail(400, {
				success: false,
				message:
					statusError instanceof Error ? statusError.message : 'Der Reviewstatus ist ungueltig.'
			});
		}

		const intent = String(formData.get('intent') ?? 'save');
		const reviewNote = String(formData.get('reviewNote') ?? '').slice(0, 4000);
		const saved = updateCurriculumSourceReview({
			id: params.id,
			reviewStatus,
			reviewNote
		});

		if (!saved) {
			return fail(404, {
				success: false,
				message: 'Lehrplanquelle konnte nicht gespeichert werden.'
			});
		}

		if (intent === 'saveAndNext') {
			const filters = readCurriculumReviewFilters(url.searchParams);
			const filterQuery = buildCurriculumReviewFilterQuery(filters);
			const navigation = getCurriculumReviewNavigation(params.id, filters);
			const targetId = navigation.nextOpen?.id ?? navigation.next?.id;
			const targetPath = targetId ? `/curriculum/${targetId}` : '/curriculum';

			redirect(303, withFilterQuery(targetPath, filterQuery));
		}

		return {
			success: true,
			message: 'Review gespeichert.'
		};
	},
	validityRule: async ({ request, params }) => {
		const formData = await request.formData();
		let ruleData;

		try {
			ruleData = readCurriculumValidityRuleFormData(formData);
		} catch (ruleError) {
			return fail(400, {
				success: false,
				message: ruleError instanceof Error ? ruleError.message : 'Gueltigkeitsregel ist ungueltig.'
			});
		}

		const validityRuleId = createCurriculumValidityRule({
			curriculumSourceId: params.id,
			...ruleData
		});

		if (!validityRuleId) {
			return fail(404, {
				success: false,
				message: 'Lehrplanquelle fuer Gueltigkeitsregel nicht gefunden.'
			});
		}

		return {
			success: true,
			message: 'Gueltigkeitsregel gespeichert.'
		};
	},
	deleteValidityRule: async ({ request, params }) => {
		const formData = await request.formData();
		const validityRuleId = String(formData.get('validityRuleId') ?? '');

		if (!validityRuleId) {
			return fail(400, {
				success: false,
				message: 'Gueltigkeitsregel fehlt.'
			});
		}

		const deleted = deleteManualCurriculumValidityRule({
			curriculumSourceId: params.id,
			validityRuleId
		});

		if (!deleted) {
			return fail(404, {
				success: false,
				message: 'Manuelle Gueltigkeitsregel konnte nicht geloescht werden.'
			});
		}

		return {
			success: true,
			message: 'Gueltigkeitsregel geloescht.'
		};
	},
	competency: async ({ request, params }) => {
		const formData = await request.formData();
		let competencyData;

		try {
			competencyData = readCurriculumCompetencyFormData(formData);
		} catch (competencyError) {
			return fail(400, {
				success: false,
				message:
					competencyError instanceof Error
						? competencyError.message
						: 'Kompetenzannotation ist ungueltig.'
			});
		}

		let competencyId;

		try {
			competencyId = createCurriculumCompetencyAnnotation({
				curriculumSourceId: params.id,
				...competencyData
			});
		} catch (competencyError) {
			return fail(400, {
				success: false,
				message:
					competencyError instanceof Error
						? competencyError.message
						: 'Kompetenzannotation konnte nicht gespeichert werden.'
			});
		}

		if (!competencyId) {
			return fail(404, {
				success: false,
				message: 'Lehrplanquelle fuer Kompetenzannotation nicht gefunden.'
			});
		}

		return {
			success: true,
			message: 'Kompetenzannotation gespeichert.'
		};
	},
	deleteCompetency: async ({ request, params }) => {
		const formData = await request.formData();
		const competencyId = String(formData.get('competencyId') ?? '');

		if (!competencyId) {
			return fail(400, {
				success: false,
				message: 'Kompetenzannotation fehlt.'
			});
		}

		const deleted = deleteCurriculumCompetencyAnnotation({
			curriculumSourceId: params.id,
			competencyId
		});

		if (deleted === 'in_use') {
			return fail(409, {
				success: false,
				message: 'Kompetenzannotation wird bereits in Stunden oder Klassenabdeckung verwendet.'
			});
		}

		if (deleted === 'not_found') {
			return fail(404, {
				success: false,
				message: 'Kompetenzannotation konnte nicht geloescht werden.'
			});
		}

		return {
			success: true,
			message: 'Kompetenzannotation geloescht.'
		};
	}
};

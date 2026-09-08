import {
	getCurriculumReviewOverview,
	readCurriculumReviewFilters
} from '$lib/server/curriculum/repository';

import type { PageServerLoad } from './$types';

const emptyOverview = {
	filters: {
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
	},
	filterQuery: '',
	filterOptions: {
		schoolTypes: [],
		subjects: [],
		reviewStatuses: [],
		versionStatuses: [],
		gradeLevels: [],
		validityStates: [],
		competencyStates: [],
		workflowStates: []
	},
	stats: {
		totalSources: 0,
		filteredSources: 0,
		validityRules: 0,
		sourcesWithValidityRules: 0,
		sourcesWithoutValidityRules: 0,
		contextMatches: 0,
		contextMismatches: 0,
		competencies: 0,
		sourcesWithCompetencies: 0,
		sourcesWithoutCompetencies: 0,
		sourcesWithHumanReviewedCompetencies: 0,
		workflowComplete: 0,
		workflowOpen: 0,
		reviewNeeded: 0,
		unreviewed: 0,
		reviewed: 0
	},
	competencyStatusCounts: {},
	workflowIssueCounts: {},
	versionStatusCounts: {},
	schoolTypeCounts: [],
	reviewQueue: []
};

export const load: PageServerLoad = ({ url }) => {
	try {
		const filters = readCurriculumReviewFilters(url.searchParams);

		return {
			databaseReady: true,
			errorMessage: null,
			...getCurriculumReviewOverview(filters)
		};
	} catch (error) {
		return {
			databaseReady: false,
			errorMessage: error instanceof Error ? error.message : 'Unbekannter Datenbankfehler',
			...emptyOverview
		};
	}
};

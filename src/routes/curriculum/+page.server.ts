import { getCurriculumReviewOverview } from '$lib/server/curriculum/repository';

import type { PageServerLoad } from './$types';

const emptyOverview = {
	stats: {
		totalSources: 0,
		validityRules: 0,
		reviewNeeded: 0,
		unreviewed: 0,
		reviewed: 0
	},
	versionStatusCounts: {},
	schoolTypeCounts: [],
	reviewQueue: []
};

export const load: PageServerLoad = () => {
	try {
		return {
			databaseReady: true,
			errorMessage: null,
			...getCurriculumReviewOverview()
		};
	} catch (error) {
		return {
			databaseReady: false,
			errorMessage: error instanceof Error ? error.message : 'Unbekannter Datenbankfehler',
			...emptyOverview
		};
	}
};

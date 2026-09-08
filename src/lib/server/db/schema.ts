import {
	integer,
	sqliteTable,
	text,
	uniqueIndex,
	type AnySQLiteColumn
} from 'drizzle-orm/sqlite-core';

const id = {
	id: text('id').primaryKey()
};

const timestamps = {
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
};

export const users = sqliteTable('users', {
	...id,
	displayName: text('display_name').notNull(),
	email: text('email'),
	role: text('role', { enum: ['teacher', 'admin'] })
		.notNull()
		.default('teacher'),
	...timestamps
});

export const userSettings = sqliteTable('user_settings', {
	...id,
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	defaultSchoolType: text('default_school_type'),
	defaultGradeLevel: integer('default_grade_level'),
	settingsJson: text('settings_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
	...timestamps
});

export const curriculumSources = sqliteTable(
	'curriculum_sources',
	{
		...id,
		jurisdiction: text('jurisdiction').notNull(),
		schoolType: text('school_type').notNull(),
		subject: text('subject').notNull(),
		title: text('title').notNull(),
		year: integer('year'),
		versionLabel: text('version_label'),
		versionStatus: text('version_status', {
			enum: ['active', 'trial', 'draft', 'expired', 'unknown']
		})
			.notNull()
			.default('unknown'),
		sourceUrl: text('source_url').notNull(),
		localPath: text('local_path'),
		contentHash: text('content_hash'),
		reviewStatus: text('review_status', {
			enum: ['unreviewed', 'review_needed', 'reviewed']
		})
			.notNull()
			.default('unreviewed'),
		sourceMetadataJson: text('source_metadata_json', { mode: 'json' })
			.notNull()
			.$type<Record<string, unknown>>(),
		...timestamps
	},
	(table) => ({
		sourceIdentity: uniqueIndex('curriculum_sources_identity_idx').on(
			table.jurisdiction,
			table.schoolType,
			table.subject,
			table.title,
			table.sourceUrl
		)
	})
);

export const curriculumValidityRules = sqliteTable('curriculum_validity_rules', {
	...id,
	curriculumSourceId: text('curriculum_source_id')
		.notNull()
		.references(() => curriculumSources.id, { onDelete: 'cascade' }),
	validFromSchoolYear: text('valid_from_school_year'),
	validToSchoolYear: text('valid_to_school_year'),
	gradeLevel: integer('grade_level').notNull(),
	ruleType: text('rule_type', { enum: ['valid', 'effective', 'expired'] }).notNull(),
	note: text('note'),
	sourceText: text('source_text').notNull(),
	confidence: text('confidence', { enum: ['low', 'medium', 'high'] })
		.notNull()
		.default('medium'),
	...timestamps
});

export const competencies = sqliteTable('competencies', {
	...id,
	curriculumSourceId: text('curriculum_source_id')
		.notNull()
		.references(() => curriculumSources.id, { onDelete: 'cascade' }),
	parentCompetencyId: text('parent_competency_id').references(
		(): AnySQLiteColumn => competencies.id,
		{
			onDelete: 'cascade'
		}
	),
	code: text('code'),
	title: text('title').notNull(),
	description: text('description'),
	gradeFrom: integer('grade_from'),
	gradeTo: integer('grade_to'),
	pageFrom: integer('page_from'),
	pageTo: integer('page_to'),
	sourceQuote: text('source_quote'),
	annotationStatus: text('annotation_status', {
		enum: ['draft', 'machine_prepared', 'human_reviewed']
	})
		.notNull()
		.default('draft'),
	metadataJson: text('metadata_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
	...timestamps
});

export const classGroups = sqliteTable('class_groups', {
	...id,
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	schoolType: text('school_type').notNull(),
	gradeLevel: integer('grade_level').notNull(),
	schoolYear: text('school_year').notNull(),
	weeklyLessonsTotal: integer('weekly_lessons_total'),
	notes: text('notes'),
	...timestamps
});

export const classSubjectAllocations = sqliteTable('class_subject_allocations', {
	...id,
	classGroupId: text('class_group_id')
		.notNull()
		.references(() => classGroups.id, { onDelete: 'cascade' }),
	subject: text('subject').notNull(),
	weeklyLessons: integer('weekly_lessons').notNull(),
	curriculumSourceId: text('curriculum_source_id').references(() => curriculumSources.id, {
		onDelete: 'set null'
	}),
	validityDecision: text('validity_decision', {
		enum: ['auto_valid', 'manual_override', 'needs_review']
	})
		.notNull()
		.default('needs_review'),
	validityNote: text('validity_note'),
	...timestamps
});

export const planModels = sqliteTable('plan_models', {
	...id,
	name: text('name').notNull(),
	description: text('description'),
	scope: text('scope', { enum: ['system', 'user'] })
		.notNull()
		.default('system'),
	ownerUserId: text('owner_user_id').references(() => users.id, { onDelete: 'cascade' }),
	isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
	...timestamps
});

export const planModelVersions = sqliteTable('plan_model_versions', {
	...id,
	planModelId: text('plan_model_id')
		.notNull()
		.references(() => planModels.id, { onDelete: 'cascade' }),
	version: integer('version').notNull(),
	status: text('status', { enum: ['draft', 'active', 'archived'] })
		.notNull()
		.default('draft'),
	definitionJson: text('definition_json', { mode: 'json' })
		.notNull()
		.$type<Record<string, unknown>>(),
	...timestamps
});

export const phaseTypes = sqliteTable('phase_types', {
	...id,
	planModelId: text('plan_model_id').references(() => planModels.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	shortName: text('short_name'),
	defaultDurationMinutes: integer('default_duration_minutes'),
	color: text('color'),
	sortOrder: integer('sort_order').notNull(),
	...timestamps
});

export const series = sqliteTable('series', {
	...id,
	classGroupId: text('class_group_id').references(() => classGroups.id, { onDelete: 'set null' }),
	planModelId: text('plan_model_id').references(() => planModels.id, { onDelete: 'set null' }),
	title: text('title').notNull(),
	subject: text('subject').notNull(),
	gradeLevel: integer('grade_level').notNull(),
	startDate: text('start_date'),
	endDate: text('end_date'),
	totalWeeks: integer('total_weeks'),
	weeklyLessons: integer('weekly_lessons'),
	metadataJson: text('metadata_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
	...timestamps
});

export const lessons = sqliteTable('lessons', {
	...id,
	seriesId: text('series_id')
		.notNull()
		.references(() => series.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	lessonDate: text('lesson_date'),
	weekIndex: integer('week_index'),
	durationMinutes: integer('duration_minutes').notNull().default(45),
	status: text('status', { enum: ['planned', 'taught', 'skipped', 'rescheduled'] })
		.notNull()
		.default('planned'),
	notes: text('notes'),
	...timestamps
});

export const lessonPhases = sqliteTable('lesson_phases', {
	...id,
	lessonId: text('lesson_id')
		.notNull()
		.references(() => lessons.id, { onDelete: 'cascade' }),
	phaseTypeId: text('phase_type_id').references(() => phaseTypes.id, { onDelete: 'set null' }),
	title: text('title').notNull(),
	description: text('description'),
	durationMinutes: integer('duration_minutes').notNull(),
	sortOrder: integer('sort_order').notNull(),
	socialForm: text('social_form'),
	method: text('method'),
	materialRefsJson: text('material_refs_json', { mode: 'json' })
		.notNull()
		.$type<Record<string, unknown>[]>(),
	...timestamps
});

export const lessonCompetencies = sqliteTable('lesson_competencies', {
	...id,
	lessonId: text('lesson_id')
		.notNull()
		.references(() => lessons.id, { onDelete: 'cascade' }),
	competencyId: text('competency_id')
		.notNull()
		.references(() => competencies.id, { onDelete: 'cascade' }),
	coverageLevel: text('coverage_level', {
		enum: ['introduced', 'practiced', 'secured', 'assessed']
	}).notNull(),
	evidenceNote: text('evidence_note'),
	...timestamps
});

export const classCurriculumCoverageMarks = sqliteTable('class_curriculum_coverage_marks', {
	...id,
	classSubjectAllocationId: text('class_subject_allocation_id')
		.notNull()
		.references(() => classSubjectAllocations.id, { onDelete: 'cascade' }),
	competencyId: text('competency_id')
		.notNull()
		.references(() => competencies.id, { onDelete: 'cascade' }),
	firstLessonId: text('first_lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
	lastLessonId: text('last_lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
	totalLessonCount: integer('total_lesson_count').notNull().default(0),
	totalMinutes: integer('total_minutes').notNull().default(0),
	coverageLevel: text('coverage_level', {
		enum: ['introduced', 'practiced', 'secured', 'assessed']
	}).notNull(),
	hoverSummaryJson: text('hover_summary_json', { mode: 'json' })
		.notNull()
		.$type<Record<string, unknown>>(),
	manualNote: text('manual_note'),
	...timestamps
});

export const materials = sqliteTable('materials', {
	...id,
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	materialType: text('material_type', {
		enum: ['file', 'link', 'text', 'generated']
	}).notNull(),
	sourceUrl: text('source_url'),
	localPath: text('local_path'),
	contentHash: text('content_hash'),
	metadataJson: text('metadata_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
	...timestamps
});

export const runSessions = sqliteTable('run_sessions', {
	...id,
	userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
	runType: text('run_type', {
		enum: ['annotation_import', 'lesson_generation', 'coverage_update']
	}).notNull(),
	status: text('status', { enum: ['queued', 'running', 'completed', 'failed'] }).notNull(),
	inputJson: text('input_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
	outputJson: text('output_json', { mode: 'json' }).$type<Record<string, unknown> | null>(),
	startedAt: text('started_at'),
	finishedAt: text('finished_at'),
	...timestamps
});

export const runEvents = sqliteTable('run_events', {
	...id,
	runSessionId: text('run_session_id')
		.notNull()
		.references(() => runSessions.id, { onDelete: 'cascade' }),
	eventType: text('event_type').notNull(),
	payloadJson: text('payload_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
	createdAt: text('created_at').notNull()
});

export const reflectionNotes = sqliteTable('reflection_notes', {
	...id,
	lessonId: text('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }),
	seriesId: text('series_id').references(() => series.id, { onDelete: 'cascade' }),
	userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
	noteText: text('note_text').notNull(),
	tagsJson: text('tags_json', { mode: 'json' }).notNull().$type<string[]>(),
	...timestamps
});

export const llmSuggestions = sqliteTable('llm_suggestions', {
	...id,
	runSessionId: text('run_session_id').references(() => runSessions.id, { onDelete: 'set null' }),
	targetType: text('target_type').notNull(),
	targetId: text('target_id'),
	promptHash: text('prompt_hash'),
	modelName: text('model_name'),
	suggestionJson: text('suggestion_json', { mode: 'json' })
		.notNull()
		.$type<Record<string, unknown>>(),
	acceptedAt: text('accepted_at'),
	rejectedAt: text('rejected_at'),
	...timestamps
});

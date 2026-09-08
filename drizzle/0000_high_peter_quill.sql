CREATE TABLE `class_curriculum_coverage_marks` (
	`id` text PRIMARY KEY NOT NULL,
	`class_subject_allocation_id` text NOT NULL,
	`competency_id` text NOT NULL,
	`first_lesson_id` text,
	`last_lesson_id` text,
	`total_lesson_count` integer DEFAULT 0 NOT NULL,
	`total_minutes` integer DEFAULT 0 NOT NULL,
	`coverage_level` text NOT NULL,
	`hover_summary_json` text NOT NULL,
	`manual_note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`class_subject_allocation_id`) REFERENCES `class_subject_allocations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competency_id`) REFERENCES `competencies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`first_lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`last_lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `class_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`school_type` text NOT NULL,
	`grade_level` integer NOT NULL,
	`school_year` text NOT NULL,
	`weekly_lessons_total` integer,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `class_subject_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`class_group_id` text NOT NULL,
	`subject` text NOT NULL,
	`weekly_lessons` integer NOT NULL,
	`curriculum_source_id` text,
	`validity_decision` text DEFAULT 'needs_review' NOT NULL,
	`validity_note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`class_group_id`) REFERENCES `class_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`curriculum_source_id`) REFERENCES `curriculum_sources`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `competencies` (
	`id` text PRIMARY KEY NOT NULL,
	`curriculum_source_id` text NOT NULL,
	`parent_competency_id` text,
	`code` text,
	`title` text NOT NULL,
	`description` text,
	`grade_from` integer,
	`grade_to` integer,
	`page_from` integer,
	`page_to` integer,
	`source_quote` text,
	`annotation_status` text DEFAULT 'draft' NOT NULL,
	`metadata_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`curriculum_source_id`) REFERENCES `curriculum_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_competency_id`) REFERENCES `competencies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `curriculum_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`jurisdiction` text NOT NULL,
	`school_type` text NOT NULL,
	`subject` text NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`version_label` text,
	`version_status` text DEFAULT 'unknown' NOT NULL,
	`source_url` text NOT NULL,
	`local_path` text,
	`content_hash` text,
	`review_status` text DEFAULT 'unreviewed' NOT NULL,
	`source_metadata_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `curriculum_sources_identity_idx` ON `curriculum_sources` (`jurisdiction`,`school_type`,`subject`,`title`,`source_url`);--> statement-breakpoint
CREATE TABLE `curriculum_validity_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`curriculum_source_id` text NOT NULL,
	`valid_from_school_year` text,
	`valid_to_school_year` text,
	`grade_level` integer NOT NULL,
	`rule_type` text NOT NULL,
	`note` text,
	`source_text` text NOT NULL,
	`confidence` text DEFAULT 'medium' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`curriculum_source_id`) REFERENCES `curriculum_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lesson_competencies` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`competency_id` text NOT NULL,
	`coverage_level` text NOT NULL,
	`evidence_note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competency_id`) REFERENCES `competencies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lesson_phases` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`phase_type_id` text,
	`title` text NOT NULL,
	`description` text,
	`duration_minutes` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`social_form` text,
	`method` text,
	`material_refs_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phase_type_id`) REFERENCES `phase_types`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`title` text NOT NULL,
	`lesson_date` text,
	`week_index` integer,
	`duration_minutes` integer DEFAULT 45 NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `llm_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`run_session_id` text,
	`target_type` text NOT NULL,
	`target_id` text,
	`prompt_hash` text,
	`model_name` text,
	`suggestion_json` text NOT NULL,
	`accepted_at` text,
	`rejected_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`run_session_id`) REFERENCES `run_sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`material_type` text NOT NULL,
	`source_url` text,
	`local_path` text,
	`content_hash` text,
	`metadata_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `phase_types` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_model_id` text,
	`name` text NOT NULL,
	`short_name` text,
	`default_duration_minutes` integer,
	`color` text,
	`sort_order` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plan_model_id`) REFERENCES `plan_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plan_model_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_model_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`definition_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plan_model_id`) REFERENCES `plan_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plan_models` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`scope` text DEFAULT 'system' NOT NULL,
	`owner_user_id` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reflection_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text,
	`series_id` text,
	`user_id` text,
	`note_text` text NOT NULL,
	`tags_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `run_events` (
	`id` text PRIMARY KEY NOT NULL,
	`run_session_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`run_session_id`) REFERENCES `run_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `run_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`run_type` text NOT NULL,
	`status` text NOT NULL,
	`input_json` text NOT NULL,
	`output_json` text,
	`started_at` text,
	`finished_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `series` (
	`id` text PRIMARY KEY NOT NULL,
	`class_group_id` text,
	`plan_model_id` text,
	`title` text NOT NULL,
	`subject` text NOT NULL,
	`grade_level` integer NOT NULL,
	`start_date` text,
	`end_date` text,
	`total_weeks` integer,
	`weekly_lessons` integer,
	`metadata_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`class_group_id`) REFERENCES `class_groups`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`plan_model_id`) REFERENCES `plan_models`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`default_school_type` text,
	`default_grade_level` integer,
	`settings_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`email` text,
	`role` text DEFAULT 'teacher' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

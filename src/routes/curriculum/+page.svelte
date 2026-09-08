<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const versionLabels: Record<string, string> = {
		active: 'aktiv',
		trial: 'Erprobung',
		draft: 'Entwurf',
		expired: 'auslaufend',
		unknown: 'unklar'
	};

	const reviewLabels: Record<string, string> = {
		unreviewed: 'ungeprueft',
		review_needed: 'Pruefung noetig',
		reviewed: 'geprueft'
	};

	const validityStateLabels: Record<string, string> = {
		without_rules: 'ohne Regeln',
		with_rules: 'mit Regeln',
		matching_context: 'passt Kontext',
		context_mismatch: 'Kontext offen'
	};

	const competencyStateLabels: Record<string, string> = {
		without_competencies: 'ohne Kompetenzen',
		with_competencies: 'mit Kompetenzen',
		needs_human_review: 'Kompetenzreview offen',
		human_reviewed: 'Kompetenz geprueft'
	};

	const workflowStateLabels: Record<string, string> = {
		open: 'offen',
		complete: 'vollstaendig',
		needs_source_review: 'Quellenreview offen',
		missing_validity: 'Gueltigkeit offen',
		missing_competencies: 'Kompetenzen fehlen',
		needs_competency_review: 'Kompetenzreview offen'
	};

	const workflowIssueLabels: Record<string, string> = {
		review_needed: 'Quellenreview offen',
		missing_validity_rules: 'Gueltigkeitsregeln fehlen',
		missing_context_validity: 'Gueltigkeit fuer Kontext offen',
		missing_competencies: 'Kompetenzen fehlen',
		competency_review_needed: 'Kompetenzreview offen'
	};

	function detailRoute() {
		return data.filterQuery
			? (`/curriculum/[id]?${data.filterQuery}` as `/curriculum/[id]?${string}`)
			: '/curriculum/[id]';
	}
</script>

<svelte:head>
	<title>Lehrplan-Review - Verlaufs-Planer</title>
</svelte:head>

<main class="app-shell">
	<header class="topbar compact-topbar">
		<div>
			<p class="eyebrow">Curriculum</p>
			<h1>Lehrplan-Review</h1>
		</div>
		<a class="nav-link" href={resolve('/')}>Arbeitsuebersicht</a>
	</header>

	{#if !data.databaseReady}
		<section class="notice-panel" aria-live="polite">
			<strong>Datenbank nicht bereit</strong>
			<p>{data.errorMessage}</p>
			<code>npm run db:import:th</code>
		</section>
	{:else}
		<section class="summary-grid" aria-label="Lehrplan-Kennzahlen">
			<div class="summary-tile">
				<span>Quellen</span>
				<strong>{data.stats.totalSources}</strong>
			</div>
			<div class="summary-tile">
				<span>Gefiltert</span>
				<strong>{data.stats.filteredSources}</strong>
			</div>
			<div class="summary-tile">
				<span>Gueltigkeitsregeln</span>
				<strong>{data.stats.validityRules}</strong>
			</div>
			<div class="summary-tile">
				<span>Kompetenzen</span>
				<strong>{data.stats.competencies}</strong>
			</div>
			<div class="summary-tile">
				<span>Ohne Regeln</span>
				<strong>{data.stats.sourcesWithoutValidityRules}</strong>
			</div>
			<div class="summary-tile attention">
				<span>Review noetig</span>
				<strong>{data.stats.reviewNeeded}</strong>
			</div>
			<div class="summary-tile attention">
				<span>Workflow offen</span>
				<strong>{data.stats.workflowOpen}</strong>
			</div>
			<div class="summary-tile">
				<span>Vollstaendig</span>
				<strong>{data.stats.workflowComplete}</strong>
			</div>
			<div class="summary-tile">
				<span>Kompetenz geprueft</span>
				<strong>{data.stats.sourcesWithHumanReviewedCompetencies}</strong>
			</div>
			{#if data.filters.gradeLevel !== 'all' || data.filters.schoolYear !== 'all'}
				<div class="summary-tile">
					<span>Kontext passt</span>
					<strong>{data.stats.contextMatches}</strong>
				</div>
				<div class="summary-tile attention">
					<span>Kontext offen</span>
					<strong>{data.stats.contextMismatches}</strong>
				</div>
			{/if}
		</section>

		<section class="review-layout" aria-label="Review-Warteschlange">
			<aside class="work-panel sidebar-panel">
				<form class="filter-form" method="GET" action={resolve('/curriculum')}>
					<label>
						Suche
						<input name="q" value={data.filters.q} placeholder="Fach, Titel, Pfad" />
					</label>
					<label>
						Reviewstatus
						<select name="reviewStatus">
							<option value="all" selected={data.filters.reviewStatus === 'all'}>alle</option>
							{#each data.filterOptions.reviewStatuses as status (status.label)}
								<option value={status.label} selected={data.filters.reviewStatus === status.label}>
									{reviewLabels[status.label] ?? status.label} ({status.count})
								</option>
							{/each}
						</select>
					</label>
					<label>
						Fassung
						<select name="versionStatus">
							<option value="all" selected={data.filters.versionStatus === 'all'}>alle</option>
							{#each data.filterOptions.versionStatuses as status (status.label)}
								<option value={status.label} selected={data.filters.versionStatus === status.label}>
									{versionLabels[status.label] ?? status.label} ({status.count})
								</option>
							{/each}
						</select>
					</label>
					<label>
						Klassenstufe
						<select name="gradeLevel">
							<option value="all" selected={data.filters.gradeLevel === 'all'}>alle</option>
							{#each data.filterOptions.gradeLevels as gradeLevel (gradeLevel.label)}
								<option
									value={gradeLevel.label}
									selected={data.filters.gradeLevel === gradeLevel.label}
								>
									{gradeLevel.label} ({gradeLevel.count})
								</option>
							{/each}
						</select>
					</label>
					<label>
						Schuljahr
						<input
							name="schoolYear"
							value={data.filters.schoolYear === 'all' ? '' : data.filters.schoolYear}
							placeholder="2026/27"
							pattern="20[0-9]{2}/[0-9]{2}"
						/>
					</label>
					<label>
						Gueltigkeit
						<select name="validityState">
							<option value="all" selected={data.filters.validityState === 'all'}>alle</option>
							{#each data.filterOptions.validityStates as state (state.label)}
								<option value={state.label} selected={data.filters.validityState === state.label}>
									{validityStateLabels[state.label] ?? state.label} ({state.count})
								</option>
							{/each}
						</select>
					</label>
					<label>
						Kompetenzannotation
						<select name="competencyState">
							<option value="all" selected={data.filters.competencyState === 'all'}>alle</option>
							{#each data.filterOptions.competencyStates as state (state.label)}
								<option value={state.label} selected={data.filters.competencyState === state.label}>
									{competencyStateLabels[state.label] ?? state.label} ({state.count})
								</option>
							{/each}
						</select>
					</label>
					<label>
						Arbeitsstatus
						<select name="workflowState">
							<option value="all" selected={data.filters.workflowState === 'all'}>alle</option>
							{#each data.filterOptions.workflowStates as state (state.label)}
								<option value={state.label} selected={data.filters.workflowState === state.label}>
									{workflowStateLabels[state.label] ?? state.label} ({state.count})
								</option>
							{/each}
						</select>
					</label>
					<label>
						Schulform
						<select name="schoolType">
							<option value="all" selected={data.filters.schoolType === 'all'}>alle</option>
							{#each data.filterOptions.schoolTypes as schoolType (schoolType.label)}
								<option
									value={schoolType.label}
									selected={data.filters.schoolType === schoolType.label}
								>
									{schoolType.label} ({schoolType.count})
								</option>
							{/each}
						</select>
					</label>
					<label>
						Fach
						<select name="subject">
							<option value="all" selected={data.filters.subject === 'all'}>alle</option>
							{#each data.filterOptions.subjects as subject (subject.label)}
								<option value={subject.label} selected={data.filters.subject === subject.label}>
									{subject.label} ({subject.count})
								</option>
							{/each}
						</select>
					</label>
					<div class="filter-actions">
						<button type="submit">Filtern</button>
						<a href={resolve('/curriculum')}>Zuruecksetzen</a>
					</div>
				</form>

				<h2>Status</h2>
				<dl class="compact-list">
					{#each Object.entries(data.versionStatusCounts) as [status, count] (status)}
						<div>
							<dt>{versionLabels[status] ?? status}</dt>
							<dd>{count}</dd>
						</div>
					{/each}
				</dl>

				<h2>Offene Arbeit</h2>
				<dl class="compact-list">
					{#each Object.entries(data.workflowIssueCounts) as [issue, count] (issue)}
						<div>
							<dt>{workflowIssueLabels[issue] ?? issue}</dt>
							<dd>{count}</dd>
						</div>
					{/each}
				</dl>

				<h2>Schulformen</h2>
				<dl class="compact-list">
					{#each data.schoolTypeCounts.slice(0, 10) as schoolType (schoolType.label)}
						<div>
							<dt>{schoolType.label}</dt>
							<dd>{schoolType.count}</dd>
						</div>
					{/each}
				</dl>
			</aside>

			<section class="source-list" aria-label="Zu pruefende Quellen">
				<div class="list-header">
					<div>
						<p class="eyebrow">Warteschlange</p>
						<h2>{data.reviewQueue.length} von {data.stats.filteredSources} Quellen</h2>
					</div>
					<span>{data.stats.reviewed} geprueft</span>
				</div>

				{#each data.reviewQueue as source (source.id)}
					<article class="source-row">
						<div class="source-main">
							<span class={`review-badge review-${source.reviewStatus}`}>
								{reviewLabels[source.reviewStatus] ?? source.reviewStatus}
							</span>
							<h3>{source.subject}</h3>
							<p>{source.title}</p>
							<small>{source.schoolType}</small>
						</div>
						<div class="source-meta">
							<span
								class={`workflow-state ${source.workflowComplete ? 'workflow-complete' : 'workflow-open'}`}
							>
								{source.workflowComplete ? 'vollstaendig' : `${source.workflowIssues.length} offen`}
							</span>
							<span>{versionLabels[source.versionStatus] ?? source.versionStatus}</span>
							<span>{source.validityRuleCount} Regeln</span>
							<span>{source.competencyCount} Kompetenzen</span>
							{#if source.humanReviewedCompetencyCount > 0}
								<span>{source.humanReviewedCompetencyCount} geprueft</span>
							{/if}
							<span>{source.manualValidityRuleCount} manuell</span>
							<span class={`validity-state validity-${source.validityContextStatus}`}>
								{validityStateLabels[source.validityContextStatus] ?? source.validityContextStatus}
								{#if source.matchingValidityRuleCount > 0}
									({source.matchingValidityRuleCount})
								{/if}
							</span>
							{#if source.year}
								<span>{source.year}</span>
							{/if}
						</div>
						<div class="source-actions">
							<a href={resolve(detailRoute(), { id: source.id })}>Pruefen</a>
							<a href={source.sourceUrl} target="_blank" rel="external noreferrer">Quelle</a>
							{#if source.localPath}
								<code>{source.localPath}</code>
							{/if}
						</div>
					</article>
				{/each}
			</section>
		</section>
	{/if}
</main>

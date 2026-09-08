<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const reviewLabels: Record<string, string> = {
		unreviewed: 'ungeprueft',
		review_needed: 'Pruefung noetig',
		reviewed: 'geprueft'
	};

	const versionLabels: Record<string, string> = {
		active: 'aktiv',
		trial: 'Erprobung',
		draft: 'Entwurf',
		expired: 'auslaufend',
		unknown: 'unklar'
	};

	const ruleTypeLabels: Record<string, string> = {
		valid: 'gueltig',
		effective: 'Inkraftsetzung',
		expired: 'auslaufend'
	};

	const confidenceLabels: Record<string, string> = {
		low: 'niedrig',
		medium: 'mittel',
		high: 'hoch'
	};

	const annotationStatusLabels: Record<string, string> = {
		draft: 'Entwurf',
		machine_prepared: 'maschinell vorbereitet',
		human_reviewed: 'menschlich geprueft'
	};

	const validityStateLabels: Record<string, string> = {
		without_rules: 'ohne Regeln',
		with_rules: 'mit Regeln',
		matching_context: 'passt Kontext',
		context_mismatch: 'Kontext offen'
	};

	const gradeLevels = Array.from({ length: 13 }, (_, index) => index + 1);

	function listRoute() {
		return data.filterQuery
			? (`/curriculum?${data.filterQuery}` as `/curriculum?${string}`)
			: '/curriculum';
	}

	function detailRoute() {
		return data.filterQuery
			? (`/curriculum/[id]?${data.filterQuery}` as `/curriculum/[id]?${string}`)
			: '/curriculum/[id]';
	}

	function actionHref(actionName: string) {
		return data.filterQuery ? `?${data.filterQuery}&/${actionName}` : `?/${actionName}`;
	}

	function metadataEntries(metadata: Record<string, unknown>) {
		return Object.entries(metadata).filter(
			([, value]) => value !== null && value !== undefined && value !== ''
		);
	}

	function formatMetadataValue(value: unknown) {
		return typeof value === 'string' ? value : JSON.stringify(value);
	}

	function formatRange(from: number | null, to: number | null, label: string) {
		if (from !== null && to !== null) {
			return from === to ? `${label} ${from}` : `${label} ${from}-${to}`;
		}

		if (from !== null) {
			return `${label} ab ${from}`;
		}

		if (to !== null) {
			return `${label} bis ${to}`;
		}

		return null;
	}
</script>

<svelte:head>
	<title>{data.source.subject} - Lehrplan-Review</title>
</svelte:head>

<main class="app-shell">
	<header class="topbar compact-topbar">
		<div>
			<p class="eyebrow">Lehrplanquelle</p>
			<h1>{data.source.subject}</h1>
		</div>
		<nav class="top-actions queue-actions" aria-label="Review-Navigation">
			<a class="nav-link" href={resolve(listRoute())}>Zur Review-Liste</a>
			{#if data.navigation.previous}
				<a class="nav-link" href={resolve(detailRoute(), { id: data.navigation.previous.id })}>
					Vorherige
				</a>
			{/if}
			{#if data.navigation.next}
				<a class="nav-link" href={resolve(detailRoute(), { id: data.navigation.next.id })}>
					Naechste
				</a>
			{/if}
			{#if data.navigation.nextOpen}
				<a class="nav-link" href={resolve(detailRoute(), { id: data.navigation.nextOpen.id })}>
					Naechste offene
				</a>
			{/if}
		</nav>
	</header>

	<section class="detail-layout">
		<section class="work-panel detail-panel" aria-label="Quellendetails">
			<div class="panel-header">
				<div>
					<p class="eyebrow">{data.source.schoolType}</p>
					<h2>{data.source.title}</h2>
				</div>
				<span class={`review-badge review-${data.source.reviewStatus}`}>
					{reviewLabels[data.source.reviewStatus] ?? data.source.reviewStatus}
				</span>
			</div>

			<section class="queue-strip" aria-label="Aktive Review-Queue">
				<div>
					<p class="eyebrow">Queue</p>
					{#if data.navigation.currentInQueue && data.navigation.position}
						<strong>Quelle {data.navigation.position} von {data.navigation.total}</strong>
					{:else}
						<strong>Nicht im aktiven Filter</strong>
					{/if}
					<span>
						{data.filters.schoolYear === 'all' ? 'Schuljahr offen' : data.filters.schoolYear}
						-
						{data.filters.gradeLevel === 'all'
							? 'Klassenstufe offen'
							: `Klasse ${data.filters.gradeLevel}`}
						-
						{validityStateLabels[data.source.validityContextStatus] ??
							data.source.validityContextStatus}
						-
						{data.source.workflowComplete
							? 'vollstaendig'
							: `${data.source.workflowIssues.length} offene Punkte`}
					</span>
				</div>
				{#if data.navigation.nextOpen}
					<a href={resolve(detailRoute(), { id: data.navigation.nextOpen.id })}>
						Weiter: {data.navigation.nextOpen.subject}
					</a>
				{/if}
			</section>

			{#if !data.source.workflowComplete}
				<section class="notice-panel compact-notice">
					<strong>Offene Arbeit</strong>
					<ul class="issue-list">
						{#each data.source.workflowIssueLabels as issueLabel (issueLabel)}
							<li>{issueLabel}</li>
						{/each}
					</ul>
				</section>
			{/if}

			<dl class="metadata-grid">
				<div>
					<dt>Fassung</dt>
					<dd>{versionLabels[data.source.versionStatus] ?? data.source.versionStatus}</dd>
				</div>
				<div>
					<dt>Jahr</dt>
					<dd>{data.source.year ?? 'unklar'}</dd>
				</div>
				<div>
					<dt>Gueltigkeitsregeln</dt>
					<dd>{data.source.validityRules.length}</dd>
				</div>
				<div>
					<dt>Kompetenzen</dt>
					<dd>{data.source.competencies.length}</dd>
				</div>
				<div>
					<dt>Kompetenz geprueft</dt>
					<dd>{data.source.competencySummary.humanReviewedCount}</dd>
				</div>
				<div>
					<dt>Arbeitsstatus</dt>
					<dd>{data.source.workflowComplete ? 'vollstaendig' : 'offen'}</dd>
				</div>
				<div>
					<dt>Zuletzt geprueft</dt>
					<dd>{data.source.reviewedAt ?? 'noch nicht'}</dd>
				</div>
			</dl>

			<div class="source-links">
				<a href={data.source.sourceUrl} target="_blank" rel="external noreferrer">Originalquelle</a>
				{#if data.source.localPath}
					<code>{data.source.localPath}</code>
				{/if}
			</div>

			{#if data.source.validityRules.length > 0}
				<h2>Gueltigkeitsregeln</h2>
				<div class="validity-list">
					{#each data.source.validityRules as rule (rule.id)}
						<article>
							<strong>{rule.validFromSchoolYear ?? 'Schuljahr unklar'}</strong>
							<span>
								Klasse {rule.gradeLevel} - {ruleTypeLabels[rule.ruleType] ?? rule.ruleType} -
								{confidenceLabels[rule.confidence] ?? rule.confidence} - {rule.origin === 'manual'
									? 'manuell'
									: 'Import'}
							</span>
							{#if rule.validToSchoolYear}
								<span>bis {rule.validToSchoolYear}</span>
							{/if}
							<p>{rule.sourceText}</p>
							{#if rule.note}
								<p>{rule.note}</p>
							{/if}
							{#if rule.origin === 'manual'}
								<form class="inline-form" method="POST" action={actionHref('deleteValidityRule')}>
									<input type="hidden" name="validityRuleId" value={rule.id} />
									<button class="danger-button" type="submit">Entfernen</button>
								</form>
							{/if}
						</article>
					{/each}
				</div>
			{:else}
				<section class="notice-panel compact-notice">
					<strong>Keine strukturierte Gueltigkeit</strong>
					<p>Diese Quelle braucht eine manuelle Pruefung gegen die Schulportal-Tabelle.</p>
				</section>
			{/if}

			<h2>Kompetenz- und Lernzielannotation</h2>
			{#if data.source.competencies.length > 0}
				<div class="competency-list">
					{#each data.source.competencies as competency (competency.id)}
						<article>
							<div class="competency-header">
								<div>
									<strong>{competency.title}</strong>
									{#if competency.code}
										<code>{competency.code}</code>
									{/if}
								</div>
								<span class={`annotation-badge annotation-${competency.annotationStatus}`}>
									{annotationStatusLabels[competency.annotationStatus] ??
										competency.annotationStatus}
								</span>
							</div>

							<div class="competency-meta">
								{#if formatRange(competency.gradeFrom, competency.gradeTo, 'Klasse')}
									<span>{formatRange(competency.gradeFrom, competency.gradeTo, 'Klasse')}</span>
								{/if}
								{#if formatRange(competency.pageFrom, competency.pageTo, 'Seite')}
									<span>{formatRange(competency.pageFrom, competency.pageTo, 'Seite')}</span>
								{/if}
							</div>

							{#if competency.description}
								<p>{competency.description}</p>
							{/if}
							{#if competency.sourceQuote}
								<blockquote>{competency.sourceQuote}</blockquote>
							{/if}

							<form class="inline-form" method="POST" action={actionHref('deleteCompetency')}>
								<input type="hidden" name="competencyId" value={competency.id} />
								<button class="danger-button" type="submit">Entfernen</button>
							</form>
						</article>
					{/each}
				</div>
			{:else}
				<section class="notice-panel compact-notice">
					<strong>Keine Kompetenzannotation</strong>
					<p>
						Fuer die spaetere Klassenuebersicht fehlen noch Kompetenzschwerpunkte, Lernziele und
						Fundstellen.
					</p>
				</section>
			{/if}
		</section>

		<aside class="work-panel review-editor" aria-label="Review bearbeiten">
			<h2>Review</h2>
			{#if form?.message}
				<p class={form.success ? 'form-message success' : 'form-message error'}>{form.message}</p>
			{/if}

			<form method="POST" action={actionHref('review')}>
				<label>
					Status
					<select name="reviewStatus">
						{#each Object.keys(reviewLabels) as status (status)}
							<option value={status} selected={data.source.reviewStatus === status}>
								{reviewLabels[status]}
							</option>
						{/each}
					</select>
				</label>

				<label>
					Reviewnotiz
					<textarea
						name="reviewNote"
						rows="9"
						placeholder="Gueltigkeit, Fundstelle oder offene Prueffrage festhalten"
						value={data.source.reviewNote ?? ''}></textarea>
				</label>

				<div class="button-row">
					<button type="submit" name="intent" value="save">Review speichern</button>
					<button type="submit" name="intent" value="saveAndNext">Speichern und weiter</button>
				</div>
			</form>

			<h2>Gueltigkeitsregel</h2>
			<form class="validity-rule-form" method="POST" action={actionHref('validityRule')}>
				<div class="validity-form-grid">
					<label>
						Schuljahr ab
						<input
							name="validFromSchoolYear"
							placeholder="2026/27"
							pattern="20[0-9]{2}/[0-9]{2}"
							required
						/>
					</label>

					<label>
						Schuljahr bis
						<input name="validToSchoolYear" placeholder="2028/29" pattern="20[0-9]{2}/[0-9]{2}" />
					</label>

					<label>
						Klasse
						<select name="gradeLevel">
							{#each gradeLevels as gradeLevel (gradeLevel)}
								<option value={gradeLevel}>{gradeLevel}</option>
							{/each}
						</select>
					</label>

					<label>
						Typ
						<select name="ruleType">
							{#each Object.entries(ruleTypeLabels) as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
					</label>

					<label>
						Sicherheit
						<select name="confidence">
							{#each Object.entries(confidenceLabels) as [value, label] (value)}
								<option {value} selected={value === 'high'}>{label}</option>
							{/each}
						</select>
					</label>
				</div>

				<label>
					Fundstelle
					<textarea
						name="sourceText"
						rows="5"
						placeholder="Text aus Schulportal-Tabelle oder Lehrplan"
						required></textarea>
				</label>

				<label>
					Notiz
					<textarea name="note" rows="3" placeholder="Optionale Pruefnotiz"></textarea>
				</label>

				<button type="submit">Regel speichern</button>
			</form>

			<h2>Kompetenzentwurf</h2>
			<form class="competency-form" method="POST" action={actionHref('competency')}>
				<div class="validity-form-grid">
					<label>
						Code
						<input name="code" placeholder="optional" />
					</label>

					<label>
						Status
						<select name="annotationStatus">
							{#each Object.entries(annotationStatusLabels) as [value, label] (value)}
								<option {value} selected={value === 'human_reviewed'}>{label}</option>
							{/each}
						</select>
					</label>

					<label>
						Klasse von
						<input name="gradeFrom" type="number" min="1" max="13" />
					</label>

					<label>
						Klasse bis
						<input name="gradeTo" type="number" min="1" max="13" />
					</label>

					<label>
						Seite von
						<input name="pageFrom" type="number" min="1" max="5000" />
					</label>

					<label>
						Seite bis
						<input name="pageTo" type="number" min="1" max="5000" />
					</label>
				</div>

				<label>
					Titel oder Kompetenzschwerpunkt
					<input name="title" required placeholder="z. B. Lesen - mit Texten umgehen" />
				</label>

				<label>
					Beschreibung oder Lernzielbezug
					<textarea
						name="description"
						rows="4"
						placeholder="Kompetenzformulierung, Lernziel oder Inhaltsbezug"></textarea>
				</label>

				<label>
					Fundtext
					<textarea
						name="sourceQuote"
						rows="4"
						placeholder="Originalformulierung oder aussagekraeftige Fundstelle"></textarea>
				</label>

				<button type="submit">Kompetenz speichern</button>
			</form>

			<h2>Metadaten</h2>
			<dl class="compact-list">
				{#each metadataEntries(data.source.sourceMetadata) as [key, value] (key)}
					<div>
						<dt>{key}</dt>
						<dd>{formatMetadataValue(value)}</dd>
					</div>
				{/each}
			</dl>
		</aside>
	</section>
</main>

<script lang="ts">
	const coverageRows = [
		{
			competency: 'Sachtexte erschliessen',
			goal: 'Aussagen belegen und bewerten',
			hours: 6,
			state: 'secured',
			weeks: ['36', '37', '38']
		},
		{
			competency: 'Argumentieren',
			goal: 'Positionen entwickeln und begruenden',
			hours: 4,
			state: 'practiced',
			weeks: ['39', '40']
		},
		{
			competency: 'Praesentieren',
			goal: 'adressatengerecht vortragen',
			hours: 2,
			state: 'introduced',
			weeks: ['41']
		}
	];

	const pipeline = [
		{ label: 'Rohdaten', value: 'rawData/flp_th', status: 'vorhanden' },
		{ label: 'Preprocess', value: 'data/preprocessed', status: 'bereit' },
		{ label: 'SQLite', value: 'data/verlaufs-planer.sqlite', status: 'lokal' },
		{ label: 'Review', value: 'Gueltigkeit & Kompetenzen', status: 'naechster Schritt' }
	];
</script>

<svelte:head>
	<title>Verlaufs-Planer</title>
	<meta
		name="description"
		content="Lokaler Unterrichtsplaner mit Lehrplanannotation, Klassenuebersicht und SQLite"
	/>
</svelte:head>

<main class="app-shell">
	<header class="topbar">
		<div>
			<p class="eyebrow">Verlaufs-Planer</p>
			<h1>Planung, Lehrplanbezug und Klassenabdeckung</h1>
		</div>
		<nav class="top-actions" aria-label="Hauptbereiche">
			<a class="nav-link" href="/curriculum">Lehrplan-Review</a>
			<div class="status-pill">Lokaler MVP</div>
		</nav>
	</header>

	<section class="workspace-grid" aria-label="Arbeitsuebersicht">
		<div class="work-panel primary-panel">
			<div class="panel-header">
				<div>
					<p class="eyebrow">Klasse 8a · Deutsch · Schuljahr 2026/27</p>
					<h2>Lehrplanabdeckung</h2>
				</div>
				<div class="metric">
					<span>4</span>
					Wochenstunden
				</div>
			</div>

			<div class="coverage-table" role="table" aria-label="Kompetenzabdeckung">
				<div class="coverage-row coverage-heading" role="row">
					<span>Kompetenzschwerpunkt</span>
					<span>Lernziel</span>
					<span>Umfang</span>
					<span>Wochen</span>
				</div>
				{#each coverageRows as row (row.competency)}
					<button
						class={`coverage-row coverage-row-${row.state}`}
						type="button"
						title={`${row.competency}: ${row.hours} Stunden in Kalenderwoche ${row.weeks.join(', ')}`}
					>
						<span>{row.competency}</span>
						<span>{row.goal}</span>
						<span>{row.hours} Std.</span>
						<span class="week-strip" aria-label={`Kalenderwochen ${row.weeks.join(', ')}`}>
							{#each row.weeks as week (week)}
								<span>{week}</span>
							{/each}
						</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="work-panel annotation-panel">
			<div class="panel-header">
				<div>
					<p class="eyebrow">Annotation</p>
					<h2>Datenvertrag</h2>
				</div>
			</div>
			<dl class="definition-list">
				<div>
					<dt>Quelle</dt>
					<dd>Schulform, Fach, Fassung, URL, lokaler Pfad</dd>
				</div>
				<div>
					<dt>Gueltigkeit</dt>
					<dd>Schuljahr, Klassenstufe, Regeltyp, Originaltext</dd>
				</div>
				<div>
					<dt>Kompetenz</dt>
					<dd>Text, Fundstelle, Bereich, Reviewstatus</dd>
				</div>
				<div>
					<dt>Abdeckung</dt>
					<dd>Stunden, Wochen, Minuten, Lernziele, Status</dd>
				</div>
			</dl>
		</div>
	</section>

	<section class="pipeline-band" aria-label="Technische Pipeline">
		{#each pipeline as step (step.label)}
			<div class="pipeline-step">
				<span>{step.label}</span>
				<strong>{step.value}</strong>
				<small>{step.status}</small>
			</div>
		{/each}
	</section>
</main>

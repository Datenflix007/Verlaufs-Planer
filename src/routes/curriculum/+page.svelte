<script lang="ts">
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
</script>

<svelte:head>
	<title>Lehrplan-Review · Verlaufs-Planer</title>
</svelte:head>

<main class="app-shell">
	<header class="topbar compact-topbar">
		<div>
			<p class="eyebrow">Curriculum</p>
			<h1>Lehrplan-Review</h1>
		</div>
		<a class="nav-link" href="/">Arbeitsuebersicht</a>
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
				<span>Gueltigkeitsregeln</span>
				<strong>{data.stats.validityRules}</strong>
			</div>
			<div class="summary-tile attention">
				<span>Review noetig</span>
				<strong>{data.stats.reviewNeeded}</strong>
			</div>
			<div class="summary-tile">
				<span>Ungeprueft</span>
				<strong>{data.stats.unreviewed}</strong>
			</div>
		</section>

		<section class="review-layout" aria-label="Review-Warteschlange">
			<aside class="work-panel sidebar-panel">
				<h2>Status</h2>
				<dl class="compact-list">
					{#each Object.entries(data.versionStatusCounts) as [status, count] (status)}
						<div>
							<dt>{versionLabels[status] ?? status}</dt>
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
						<h2>{data.reviewQueue.length} Quellen</h2>
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
							<span>{versionLabels[source.versionStatus] ?? source.versionStatus}</span>
							<span>{source.validityRuleCount} Regeln</span>
							{#if source.year}
								<span>{source.year}</span>
							{/if}
						</div>
						<div class="source-actions">
							<a href={source.sourceUrl} target="_blank" rel="noreferrer">Quelle</a>
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

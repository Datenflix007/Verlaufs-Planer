import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { createCurriculumSourceAnnotationDraft } from '../../src/lib/shared/annotation/curriculum';

interface DownloadManifestEntry {
	school?: string;
	subschool?: string | null;
	schoolType?: string;
	subject: string;
	title?: string;
	label?: string;
	sourceUrl?: string;
	url?: string;
	pdf_url?: string;
	detail_url?: string;
	source_page?: string | null;
	localPath?: string;
	local_path?: string;
	original_filename?: string;
	sha256?: string;
	size_bytes?: number;
	status?: string;
	validityText?: string;
	validity?: string;
	[key: string]: unknown;
}

const manifestPath = 'rawData/flp_th/download_manifest.json';
const outputPath = 'data/preprocessed/thuringia-curriculum-sources.json';

const rawManifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
	entries?: DownloadManifestEntry[];
	downloaded?: DownloadManifestEntry[];
	failures?: DownloadManifestEntry[];
};

const entries = rawManifest.entries ?? rawManifest.downloaded ?? [];

const drafts = entries
	.map((entry) => {
		const label = entry.title ?? entry.label ?? entry.subject;
		const schoolType = [entry.schoolType ?? entry.school, entry.subschool]
			.filter(Boolean)
			.join('/');
		const labelParts = label.split(';').map((part) => part.trim());
		const validityText = entry.validityText ?? entry.validity ?? labelParts.slice(1).join('; ');

		return {
			entry,
			draft: createCurriculumSourceAnnotationDraft({
				schoolType,
				subject: entry.subject,
				title: labelParts[0] ?? label,
				sourceUrl: entry.sourceUrl ?? entry.url ?? entry.pdf_url ?? entry.detail_url ?? '',
				localPath: entry.localPath ?? entry.local_path ?? null,
				validityText,
				metadata: {
					importedFrom: manifestPath,
					manifestTitle: label,
					sourcePage: entry.source_page ?? null,
					detailUrl: entry.detail_url ?? null,
					originalFilename: entry.original_filename ?? null,
					sha256: entry.sha256 ?? null,
					sizeBytes: entry.size_bytes ?? null,
					downloadStatus: entry.status ?? null
				}
			})
		};
	})
	.filter(({ draft }) => draft.schoolType && draft.subject && draft.sourceUrl)
	.map(({ draft }) => draft);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(drafts, null, 2)}\n`, 'utf8');

const reviewNeeded = drafts.filter((draft) => draft.reviewStatus === 'review_needed').length;

console.log(
	`Prepared ${drafts.length} Thuringia curriculum source drafts (${reviewNeeded} need validity review).`
);

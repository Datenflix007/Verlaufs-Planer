import { mkdirSync } from 'node:fs';

for (const directory of ['data', 'data/preprocessed']) {
	mkdirSync(directory, { recursive: true });
}

import { randomUUID } from 'node:crypto';

import { db } from '../src/lib/server/db';
import { phaseTypes, planModels, planModelVersions } from '../src/lib/server/db/schema';

const now = new Date().toISOString();

const verlaufsplanModelId = 'model-standard-verlaufsplan';
const kriterienModelId = 'model-kriterienorientiert';

db.insert(planModels)
	.values([
		{
			id: verlaufsplanModelId,
			name: 'Standard-Verlaufsplan',
			description:
				'Kompakter Unterrichtsverlauf mit Einstieg, Erarbeitung, Sicherung und Reflexion.',
			scope: 'system',
			isDefault: true,
			createdAt: now,
			updatedAt: now
		},
		{
			id: kriterienModelId,
			name: 'Kriterienorientierter Verlaufsplan',
			description:
				'Planungsmodell mit expliziten Lernzielen, Kompetenzbezug, Materialentscheidungen und Reflexionsnotizen.',
			scope: 'system',
			isDefault: false,
			createdAt: now,
			updatedAt: now
		}
	])
	.onConflictDoNothing()
	.run();

db.insert(planModelVersions)
	.values([
		{
			id: 'model-standard-verlaufsplan-v1',
			planModelId: verlaufsplanModelId,
			version: 1,
			status: 'active',
			definitionJson: {
				requiredFields: ['lernziel', 'kompetenzbezug', 'phase', 'material', 'sicherung'],
				defaultLessonMinutes: 45
			},
			createdAt: now,
			updatedAt: now
		},
		{
			id: 'model-kriterienorientiert-v1',
			planModelId: kriterienModelId,
			version: 1,
			status: 'active',
			definitionJson: {
				requiredFields: [
					'lernziel',
					'kompetenzschwerpunkt',
					'diagnose',
					'methode',
					'differenzierung',
					'reflexion'
				],
				defaultLessonMinutes: 45
			},
			createdAt: now,
			updatedAt: now
		}
	])
	.onConflictDoNothing()
	.run();

db.insert(phaseTypes)
	.values([
		{
			id: 'phase-einstieg',
			planModelId: verlaufsplanModelId,
			name: 'Einstieg',
			shortName: 'E',
			defaultDurationMinutes: 5,
			color: '#2563eb',
			sortOrder: 10,
			createdAt: now,
			updatedAt: now
		},
		{
			id: 'phase-erarbeitung',
			planModelId: verlaufsplanModelId,
			name: 'Erarbeitung',
			shortName: 'EA',
			defaultDurationMinutes: 25,
			color: '#059669',
			sortOrder: 20,
			createdAt: now,
			updatedAt: now
		},
		{
			id: 'phase-sicherung',
			planModelId: verlaufsplanModelId,
			name: 'Sicherung',
			shortName: 'S',
			defaultDurationMinutes: 10,
			color: '#d97706',
			sortOrder: 30,
			createdAt: now,
			updatedAt: now
		},
		{
			id: 'phase-reflexion',
			planModelId: verlaufsplanModelId,
			name: 'Reflexion',
			shortName: 'R',
			defaultDurationMinutes: 5,
			color: '#7c3aed',
			sortOrder: 40,
			createdAt: now,
			updatedAt: now
		}
	])
	.onConflictDoNothing()
	.run();

console.log(`Seeded ${randomUUID()} baseline planning models and phase types.`);

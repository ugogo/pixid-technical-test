import type { components } from '@/shared/api/schema';

import { CURRENT_COMPANY_ID } from '@/shared/api/current-company';
import type { TransitionAction } from '@/shared/api/enums';

import { createMockStore, type MockStore } from './store';
import type { WorkflowConfiguration } from './workflow';

type Compensation = components['schemas']['Compensation'];
type Location = components['schemas']['Location'];

export const OTHER_COMPANY_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const MANAGER = 'manager@company.example';

/** Seeded offers are dated back from this day, so lists and tests read the same every run. */
const SEED_START = Date.parse('2026-08-03T08:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

const WORKFLOWS = {
  direct: { approvalRequired: false, partialSaveEnabled: false, manualPostingRequired: false },
  approval: { approvalRequired: true, partialSaveEnabled: false, manualPostingRequired: false },
  posting: { approvalRequired: false, partialSaveEnabled: false, manualPostingRequired: true },
  partial: { approvalRequired: true, partialSaveEnabled: true, manualPostingRequired: false },
  full: { approvalRequired: true, partialSaveEnabled: true, manualPostingRequired: true },
} satisfies Record<string, WorkflowConfiguration>;

/** The configuration the current company starts with; new offers follow it. */
const CURRENT_WORKFLOW = WORKFLOWS.partial;

type Step =
  | TransitionAction
  | { action: TransitionAction; reason: string }
  | { compensation: Compensation };

interface SeedOffer {
  title: string;
  location: Location;
  compensation?: Compensation;
  workflow: WorkflowConfiguration;
  steps?: Step[];
  companyId?: string;
}

function at(city: string, postalCode: string, region: string, countryCode = 'FR'): Location {
  return { type: 'CUSTOM', address: { postalCode, city, region, countryCode } };
}

const COMPANY_ADDRESS: Location = { type: 'COMPANY_ADDRESS' };

function salary(
  type: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY',
  amount: number,
  currency = 'EUR',
): Compensation {
  return { salaryEntries: [{ type, amount, currency }] };
}

function withBonus(
  compensation: Compensation,
  type: 'SIGNING' | 'PERFORMANCE' | 'ANNUAL' | 'OTHER',
  amount: number,
  description?: string,
): Compensation {
  const currency = compensation.salaryEntries?.[0]?.currency ?? 'EUR';

  return {
    ...compensation,
    bonusEntries: [{ type, amount, currency, ...(description && { description }) }],
  };
}

/** Oldest first: each offer walks its steps through the store, so its status, dates and history agree. */
const SEED_OFFERS: SeedOffer[] = [
  {
    title: 'Préparateur de commandes (H/F)',
    location: at('Lyon', '69007', 'Auvergne-Rhône-Alpes'),
    compensation: salary('HOURLY', 12.5),
    workflow: WORKFLOWS.direct,
    steps: ['submit', 'close'],
  },
  {
    title: 'Cariste CACES 3 (H/F)',
    location: at('Villepinte', '93420', 'Île-de-France'),
    compensation: withBonus(salary('HOURLY', 13.2), 'PERFORMANCE', 150),
    workflow: WORKFLOWS.approval,
    steps: ['submit', 'approve', 'close'],
  },
  {
    title: 'Agent de quai (H/F)',
    location: at('Rungis', '94150', 'Île-de-France'),
    compensation: salary('HOURLY', 12.3),
    workflow: WORKFLOWS.full,
    steps: ['submit', 'approve', 'post'],
  },
  {
    title: 'Infirmier de nuit (H/F)',
    location: at('Lille', '59000', 'Hauts-de-France'),
    compensation: salary('MONTHLY', 2650),
    workflow: WORKFLOWS.approval,
    steps: ['submit', 'approve'],
  },
  {
    title: 'Assistant comptable (H/F)',
    location: COMPANY_ADDRESS,
    compensation: salary('MONTHLY', 2300),
    workflow: WORKFLOWS.direct,
    steps: ['submit', 'close', 'reopen'],
  },
  {
    title: 'Technicien de maintenance industrielle (H/F)',
    location: at('Grenoble', '38000', 'Auvergne-Rhône-Alpes'),
    compensation: withBonus(salary('YEARLY', 34000), 'SIGNING', 1500),
    workflow: WORKFLOWS.direct,
    steps: ['submit'],
  },
  {
    title: 'Conducteur poids lourd SPL (H/F)',
    location: at('Rouen', '76000', 'Normandie'),
    compensation: salary('HOURLY', 14.1),
    workflow: WORKFLOWS.posting,
    steps: ['submit'],
  },
  {
    title: 'Hôte de caisse (H/F)',
    location: at('Bordeaux', '33000', 'Nouvelle-Aquitaine'),
    compensation: salary('HOURLY', 12.1),
    workflow: WORKFLOWS.direct,
    steps: ['submit', 'close'],
  },
  {
    title: 'Développeur Java senior (H/F)',
    location: at('Paris', '75009', 'Île-de-France'),
    compensation: withBonus(salary('YEARLY', 62000), 'ANNUAL', 4000),
    workflow: WORKFLOWS.approval,
    steps: ['submit', 'approve'],
  },
  {
    title: 'Opérateur de production (H/F)',
    location: at('Reims', '51100', 'Grand Est'),
    compensation: withBonus(
      salary('HOURLY', 12.4),
      'OTHER',
      6.5,
      'Prime de panier par jour travaillé',
    ),
    workflow: WORKFLOWS.full,
    steps: ['submit', 'approve'],
  },
  {
    title: 'Magasinier (H/F)',
    location: at('Bruxelles', '1000', 'Bruxelles-Capitale', 'BE'),
    compensation: salary('HOURLY', 15.8),
    workflow: WORKFLOWS.approval,
    steps: [
      'submit',
      {
        action: 'reject',
        reason: 'Le taux horaire ne respecte pas la grille de la convention collective.',
      },
    ],
  },
  {
    title: 'Soudeur TIG (H/F)',
    location: at('Saint-Nazaire', '44600', 'Pays de la Loire'),
    compensation: salary('HOURLY', 15.5),
    workflow: WORKFLOWS.direct,
    steps: ['submit'],
  },
  {
    title: 'Chargé de recrutement (H/F)',
    location: COMPANY_ADDRESS,
    compensation: salary('YEARLY', 36000),
    workflow: WORKFLOWS.approval,
    steps: ['submit', 'approve', 'close'],
  },
  {
    title: 'Aide-soignant (H/F)',
    location: at('Nantes', '44000', 'Pays de la Loire'),
    compensation: salary('MONTHLY', 2050),
    workflow: WORKFLOWS.full,
    steps: ['submit'],
  },
  {
    title: 'Électricien du bâtiment (H/F)',
    location: at('Toulouse', '31000', 'Occitanie'),
    compensation: salary('DAILY', 160),
    workflow: WORKFLOWS.posting,
    steps: ['submit', 'post'],
  },
  {
    title: 'Serveur en brasserie (H/F)',
    location: at('Genève', '1201', 'Genève', 'CH'),
    compensation: salary('MONTHLY', 4300, 'CHF'),
    workflow: WORKFLOWS.approval,
    steps: ['submit'],
  },
  {
    title: 'Gestionnaire de paie (H/F)',
    location: COMPANY_ADDRESS,
    compensation: salary('YEARLY', 40000),
    workflow: WORKFLOWS.partial,
    steps: ['submit', 'approve', 'withdraw'],
  },
  {
    title: 'Plombier chauffagiste (H/F)',
    location: at('Marseille', '13002', "Provence-Alpes-Côte d'Azur"),
    workflow: WORKFLOWS.partial,
    steps: [{ compensation: salary('HOURLY', 16) }, 'finalize'],
  },
  {
    title: 'Manutentionnaire (H/F)',
    location: at('Lyon', '69003', 'Auvergne-Rhône-Alpes'),
    compensation: salary('HOURLY', 12.2),
    workflow: WORKFLOWS.full,
    steps: ['submit', 'approve'],
  },
  {
    title: 'Technicien support informatique (H/F)',
    location: at('Rennes', '35000', 'Bretagne'),
    compensation: salary('YEARLY', 31000),
    workflow: WORKFLOWS.direct,
    steps: ['submit'],
  },
  {
    title: 'Agent de sécurité (H/F)',
    location: at('Nice', '06000', "Provence-Alpes-Côte d'Azur"),
    compensation: salary('HOURLY', 12.6),
    workflow: WORKFLOWS.partial,
    steps: ['submit'],
  },
  {
    title: 'Commercial terrain (H/F)',
    location: at('Strasbourg', '67000', 'Grand Est'),
    compensation: withBonus(salary('YEARLY', 32000), 'PERFORMANCE', 6000),
    workflow: WORKFLOWS.approval,
  },
  {
    title: 'Peintre en bâtiment (H/F)',
    location: at('Montpellier', '34000', 'Occitanie'),
    workflow: WORKFLOWS.partial,
  },
  {
    title: 'Cuisinier (H/F)',
    location: at('Annecy', '74000', 'Auvergne-Rhône-Alpes'),
    workflow: WORKFLOWS.full,
  },
  {
    title: 'Assistant de direction (H/F)',
    location: COMPANY_ADDRESS,
    compensation: salary('MONTHLY', 2600),
    workflow: WORKFLOWS.direct,
  },
  {
    title: 'Chauffeur livreur VL (H/F)',
    location: at('Orléans', '45000', 'Centre-Val de Loire'),
    workflow: WORKFLOWS.partial,
  },
  {
    title: 'Technicien de laboratoire (H/F)',
    location: at('Lyon', '69008', 'Auvergne-Rhône-Alpes'),
    compensation: salary('MONTHLY', 2400),
    workflow: WORKFLOWS.partial,
  },
  {
    title: 'Mécanicien poids lourd (H/F)',
    location: at('Le Havre', '76600', 'Normandie'),
    compensation: salary('HOURLY', 14.8),
    workflow: WORKFLOWS.posting,
  },
  {
    title: 'Comptable fournisseurs (H/F)',
    location: COMPANY_ADDRESS,
    workflow: WORKFLOWS.full,
    steps: ['withdraw'],
  },
  {
    title: 'Agent d’entretien (H/F)',
    location: at('Dijon', '21000', 'Bourgogne-Franche-Comté'),
    compensation: salary('HOURLY', 12),
    workflow: WORKFLOWS.partial,
  },
  {
    title: 'Responsable logistique (H/F)',
    location: at('Lille', '59000', 'Hauts-de-France'),
    compensation: salary('YEARLY', 45000),
    workflow: WORKFLOWS.direct,
    steps: ['submit'],
    companyId: OTHER_COMPANY_ID,
  },
  {
    title: 'Agent de production (H/F)',
    location: at('Tours', '37000', 'Centre-Val de Loire'),
    compensation: salary('HOURLY', 12.2),
    workflow: WORKFLOWS.direct,
    companyId: OTHER_COMPANY_ID,
  },
];

/**
 * A store holding the seeded offers, built through the store's own operations under a clock
 * that starts at `SEED_START` and moves forward with each offer; the real clock takes over after.
 */
export function createSeededStore(): MockStore {
  let isSeeding = true;
  let seedTime = SEED_START;
  let idCount = 0;
  const store = createMockStore({
    now: () => (isSeeding ? new Date(seedTime) : new Date()),
    // Counted, not random: `crypto.randomUUID` only exists on https or localhost, and the app may be
    // opened from another device on the local network.
    createId: () => `00000000-0000-4000-8000-${String(++idCount).padStart(12, '0')}`,
  });

  for (const { companyId = CURRENT_COMPANY_ID, workflow, steps = [], ...content } of SEED_OFFERS) {
    store.updateConfiguration(companyId, companyId, workflow);
    const { id } = store.createJobOffer(companyId, content);

    for (const step of steps) {
      seedTime += DAY / 4;

      if (typeof step === 'string') {
        store.transitionJobOffer(companyId, id, step, {}, step === 'approve' ? MANAGER : undefined);
      } else if ('action' in step) {
        store.transitionJobOffer(companyId, id, step.action, { reason: step.reason }, MANAGER);
      } else {
        store.updateJobOffer(companyId, id, { compensation: step.compensation });
      }
    }

    seedTime += 3 * DAY;
  }

  store.updateConfiguration(CURRENT_COMPANY_ID, CURRENT_COMPANY_ID, CURRENT_WORKFLOW);
  store.updateConfiguration(OTHER_COMPANY_ID, OTHER_COMPANY_ID, WORKFLOWS.direct);
  isSeeding = false;

  return store;
}

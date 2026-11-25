import { TRANSITION_ACTIONS, type JobOfferSort, type JobOfferStatus } from '@/shared/api/enums';
import type { components, operations } from '@/shared/api/schema';
import { isOneOf } from '@/shared/is-one-of';

import { ApiError, badRequest, notFound, validationFailed } from './api-error';
import {
  missingFields,
  validateJobOfferRequest,
  type FieldError,
  type JobOfferContent,
} from './validation';
import { availableTransitions, type WorkflowConfiguration } from './workflow';

type Schemas = components['schemas'];
type JobOffer = Schemas['JobOffer'];
type CompanyConfiguration = Schemas['CompanyConfiguration'];
type TransitionHistoryEntry = Schemas['TransitionHistoryEntry'];

type ApiListQuery = NonNullable<operations['listJobOffers']['parameters']['query']>;

/** The swagger's list query, with its defaults applied by the handler. */
export type ListQuery = Omit<ApiListQuery, 'page' | 'size' | 'sort' | 'status'> &
  Required<Pick<ApiListQuery, 'page' | 'size' | 'sort' | 'status'>>;

/** An offer as the server keeps it: the workflow it was created with, and its audit log. */
interface StoredJobOffer extends JobOfferContent {
  id: string;
  companyId: string;
  status: JobOfferStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  closedAt: string | null;
  workflow: WorkflowConfiguration;
  history: TransitionHistoryEntry[];
}

const EDITABLE_STATUSES: JobOfferStatus[] = ['DRAFT', 'TO_FINALIZE'];
const DEFAULT_WORKFLOW: WorkflowConfiguration = {
  approvalRequired: false,
  partialSaveEnabled: false,
  manualPostingRequired: false,
};

export const CURRENT_USER = 'recruiter@company.example';

interface StoreOptions {
  now?: () => Date;
  createId?: () => string;
}

/** A company address is not exposed by the API, so its offers have no city. */
function cityOf(offer: StoredJobOffer): string | null {
  return offer.location.type === 'CUSTOM' ? (offer.location.address?.city ?? null) : null;
}

function includesIgnoringCase(value: string | null, search: string) {
  return value?.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ?? false;
}

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'publishedAt'] as const;

/** Sorts on the stored offer; an unpublished offer sorts last either way, ties by id. */
function compareOffers(sort: JobOfferSort) {
  const field = SORT_FIELDS.find((candidate) => sort.endsWith(candidate)) ?? 'createdAt';
  const direction = sort.startsWith('-') ? -1 : 1;

  return (a: StoredJobOffer, b: StoredJobOffer) => {
    const left = a[field];
    const right = b[field];

    if (left === null || right === null) {
      if (left === right) return a.id.localeCompare(b.id);
      return left === null ? 1 : -1;
    }

    const order =
      field === 'title'
        ? left.localeCompare(right, 'fr', { sensitivity: 'base' })
        : left.localeCompare(right);

    return order === 0 ? a.id.localeCompare(b.id) : order * direction;
  };
}

/** Keeps only the fields the API defines; a company address carries no address of its own. */
function toContent(body: Record<string, unknown>, current?: JobOfferContent): JobOfferContent {
  // The body passed validateJobOfferRequest, and a create carries a title and a location.
  const merged = { ...current, ...body } as JobOfferContent;
  const location =
    merged.location.type === 'CUSTOM' ? merged.location : { type: merged.location.type };

  return {
    title: merged.title.trim(),
    location,
    ...(merged.compensation && { compensation: merged.compensation }),
  };
}

function completenessErrors(content: JobOfferContent): FieldError[] {
  return missingFields(content).map((field) => ({
    field,
    message: 'at least one salary or bonus entry is required',
  }));
}

/**
 * The mocked server's state and rules: offers scoped by company, the swagger's state machine,
 * and each company's workflow configuration.
 */
export function createMockStore({
  now = () => new Date(),
  createId = () => crypto.randomUUID(),
}: StoreOptions = {}) {
  const offers = new Map<string, StoredJobOffer>();
  const configurations = new Map<string, CompanyConfiguration>();

  function timestamp() {
    return now().toISOString();
  }

  function workflowOf(companyId: string): WorkflowConfiguration {
    const configuration = configurations.get(companyId);

    if (!configuration) return DEFAULT_WORKFLOW;

    const { approvalRequired, partialSaveEnabled, manualPostingRequired } = configuration;

    return { approvalRequired, partialSaveEnabled, manualPostingRequired };
  }

  function find(companyId: string, jobOfferId: string): StoredJobOffer {
    const offer = offers.get(jobOfferId);

    if (!offer || offer.companyId !== companyId) throw notFound(jobOfferId);

    return offer;
  }

  function transitionsOf(offer: StoredJobOffer) {
    return availableTransitions(offer.status, offer.workflow, missingFields(offer).length === 0);
  }

  function toJobOffer(offer: StoredJobOffer): JobOffer {
    const { workflow: _workflow, history: _history, ...jobOffer } = offer;

    return {
      ...structuredClone(jobOffer),
      availableTransitions: transitionsOf(offer).map((transition) => transition.action),
      isComplete: missingFields(offer).length === 0,
    };
  }

  function getConfiguration(callerCompanyId: string, companyId: string): CompanyConfiguration {
    if (callerCompanyId !== companyId) {
      throw new ApiError(403, {
        code: 'FORBIDDEN',
        message: `Not authorized to access configuration of company ${companyId}`,
      });
    }

    return {
      companyId,
      ...workflowOf(companyId),
      updatedAt: configurations.get(companyId)?.updatedAt ?? timestamp(),
    };
  }

  function invalidState(offer: StoredJobOffer, verb: string, allowedStatuses: JobOfferStatus[]) {
    return new ApiError(409, {
      code: 'INVALID_STATE',
      message: `Cannot ${verb} job offer in ${offer.status} status`,
      details: { currentStatus: offer.status, allowedStatuses },
    });
  }

  return {
    listJobOffers(companyId: string, query: ListQuery): Schemas['JobOfferPage'] {
      const matching = [...offers.values()]
        .filter((offer) => offer.companyId === companyId)
        .filter((offer) => query.status.length === 0 || query.status.includes(offer.status))
        .filter(
          (offer) => !query.titleContains || includesIgnoringCase(offer.title, query.titleContains),
        )
        .filter(
          (offer) => !query.locationCity || includesIgnoringCase(cityOf(offer), query.locationCity),
        )
        .filter((offer) => !query.createdAfter || offer.createdAt >= query.createdAfter)
        .filter((offer) => !query.createdBefore || offer.createdAt < query.createdBefore)
        .toSorted(compareOffers(query.sort));
      const start = query.page * query.size;

      return {
        content: matching.slice(start, start + query.size).map((offer) => ({
          id: offer.id,
          companyId: offer.companyId,
          title: offer.title,
          status: offer.status,
          locationCity: cityOf(offer),
          createdAt: offer.createdAt,
          publishedAt: offer.publishedAt,
        })),
        page: query.page,
        size: query.size,
        totalElements: matching.length,
        totalPages: Math.ceil(matching.length / query.size),
      };
    },

    getJobOffer(companyId: string, jobOfferId: string): JobOffer {
      return toJobOffer(find(companyId, jobOfferId));
    },

    /**
     * Creates an offer under the company's current workflow, which it keeps from then on.
     * With partial save, an offer without compensation starts in `TO_FINALIZE`.
     */
    createJobOffer(companyId: string, body: Record<string, unknown>): JobOffer {
      const fieldErrors = validateJobOfferRequest(body, 'create');

      if (fieldErrors.length > 0) throw validationFailed(fieldErrors);

      const content = toContent(body);
      const workflow = workflowOf(companyId);
      const isComplete = missingFields(content).length === 0;

      if (!isComplete && !workflow.partialSaveEnabled) {
        throw validationFailed(completenessErrors(content));
      }

      const createdAt = timestamp();
      const offer: StoredJobOffer = {
        ...content,
        id: createId(),
        companyId,
        status: isComplete ? 'DRAFT' : 'TO_FINALIZE',
        createdAt,
        updatedAt: createdAt,
        publishedAt: null,
        closedAt: null,
        workflow,
        history: [],
      };

      offers.set(offer.id, offer);

      return toJobOffer(offer);
    },

    /** Replaces the fields the body carries; the status does not change. */
    updateJobOffer(companyId: string, jobOfferId: string, body: Record<string, unknown>): JobOffer {
      const offer = find(companyId, jobOfferId);

      if (!EDITABLE_STATUSES.includes(offer.status)) {
        throw invalidState(offer, 'update', EDITABLE_STATUSES);
      }

      const fieldErrors = validateJobOfferRequest(body, 'update');

      if (fieldErrors.length > 0) throw validationFailed(fieldErrors);

      const content = toContent(body, offer);

      if (missingFields(content).length > 0 && !offer.workflow.partialSaveEnabled) {
        throw validationFailed(completenessErrors(content));
      }

      const updated: StoredJobOffer = { ...offer, ...content, updatedAt: timestamp() };

      offers.set(offer.id, updated);

      return toJobOffer(updated);
    },

    deleteJobOffer(companyId: string, jobOfferId: string) {
      const offer = find(companyId, jobOfferId);

      if (offer.status !== 'DRAFT') throw invalidState(offer, 'delete', ['DRAFT']);

      offers.delete(offer.id);
    },

    getTransitions(companyId: string, jobOfferId: string): Schemas['AvailableTransitions'] {
      const offer = find(companyId, jobOfferId);

      return { currentStatus: offer.status, transitions: transitionsOf(offer) };
    },

    transitionJobOffer(
      companyId: string,
      jobOfferId: string,
      action: string,
      body: Record<string, unknown>,
      performedBy = CURRENT_USER,
    ): JobOffer {
      const offer = find(companyId, jobOfferId);

      if (!isOneOf(TRANSITION_ACTIONS, action))
        throw badRequest(`Unknown transition action: '${action}'`);

      const transitions = transitionsOf(offer);
      const transition = transitions.find((candidate) => candidate.action === action);

      if (!transition) {
        throw new ApiError(400, {
          code: 'INVALID_TRANSITION',
          message: `Cannot perform '${action}' from ${offer.status} status`,
          details: {
            currentStatus: offer.status,
            requestedAction: action,
            validActions: transitions.map((candidate) => candidate.action),
          },
        });
      }

      const fieldErrors: FieldError[] = [];
      const { reason, comment } = body;

      if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) {
        fieldErrors.push({
          field: 'reason',
          message: 'size must be at most 500',
          rejectedValue: reason,
        });
      }

      if (comment !== undefined && (typeof comment !== 'string' || comment.length > 1000)) {
        fieldErrors.push({
          field: 'comment',
          message: 'size must be at most 1000',
          rejectedValue: comment,
        });
      }

      if (transition.requiresReason && (typeof reason !== 'string' || reason.trim() === '')) {
        fieldErrors.push({ field: 'reason', message: 'must not be blank' });
      }

      if (fieldErrors.length > 0) throw validationFailed(fieldErrors);

      const missing = missingFields(offer);
      const completesOffer =
        (action === 'submit' || action === 'finalize') && transition.targetStatus !== 'TO_FINALIZE';

      if (completesOffer && missing.length > 0) {
        throw new ApiError(422, {
          code: 'INCOMPLETE_OFFER',
          message: `Cannot ${action} incomplete job offer`,
          details: { missingFields: missing },
        });
      }

      const performedAt = timestamp();
      const targetStatus = transition.targetStatus;

      offer.history.push({
        id: createId(),
        fromStatus: offer.status,
        toStatus: targetStatus,
        action,
        performedAt,
        performedBy,
        reason: typeof reason === 'string' ? reason : null,
        comment: typeof comment === 'string' ? comment : null,
      });
      offer.status = targetStatus;
      offer.updatedAt = performedAt;

      if (targetStatus === 'PUBLISHED') offer.publishedAt ??= performedAt;
      if (targetStatus === 'CLOSED') offer.closedAt = performedAt;
      if (action === 'reopen') offer.closedAt = null;
      if (targetStatus === 'DRAFT') {
        offer.publishedAt = null;
        offer.closedAt = null;
      }

      return toJobOffer(offer);
    },

    getHistory(companyId: string, jobOfferId: string): TransitionHistoryEntry[] {
      return structuredClone(find(companyId, jobOfferId).history);
    },

    getConfiguration,

    /** Applies to offers created from now on; existing offers keep their own workflow. */
    updateConfiguration(
      callerCompanyId: string,
      companyId: string,
      body: Record<string, unknown>,
    ): CompanyConfiguration {
      const current = getConfiguration(callerCompanyId, companyId);
      const flags = ['approvalRequired', 'partialSaveEnabled', 'manualPostingRequired'] as const;
      const invalidFlag = flags.find(
        (flag) => body[flag] !== undefined && typeof body[flag] !== 'boolean',
      );

      if (invalidFlag) throw badRequest(`Invalid value for '${invalidFlag}': expected a boolean`);

      const updated: CompanyConfiguration = { ...current, updatedAt: timestamp() };

      for (const flag of flags) {
        const value = body[flag];

        if (typeof value === 'boolean') updated[flag] = value;
      }

      configurations.set(companyId, updated);

      return { ...updated };
    },
  };
}

export type MockStore = ReturnType<typeof createMockStore>;

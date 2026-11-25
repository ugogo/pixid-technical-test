import { z } from 'zod';

import { JOB_OFFER_SORTS, JOB_OFFER_STATUSES } from '@/shared/api/enums';

import type { JobOfferListQuery } from './job-offer-types';

export const PAGE_SIZES = [10, 20, 50, 100] as const;

/**
 * The list's state in the URL: the API's own query, except the dates, which hold days.
 * A value the URL cannot hold falls back to its default instead of failing the page.
 */
export const jobOfferListSearchSchema = z.object({
  page: z.number().int().nonnegative().default(0).catch(0),
  size: z.literal(PAGE_SIZES).default(20).catch(20),
  sort: z.enum(JOB_OFFER_SORTS).default('-createdAt').catch('-createdAt'),
  status: z.array(z.enum(JOB_OFFER_STATUSES)).default([]).catch([]),
  titleContains: z.string().min(1).max(100).optional().catch(undefined),
  locationCity: z.string().min(1).max(100).optional().catch(undefined),
  createdFrom: z.iso.date().optional().catch(undefined),
  createdTo: z.iso.date().optional().catch(undefined),
});

export type JobOfferListSearch = z.infer<typeof jobOfferListSearchSchema>;

export const DEFAULT_JOB_OFFER_LIST_SEARCH = jobOfferListSearchSchema.parse({});

/**
 * The instant a day picked in a date field begins for the user, as the ISO date-time the API
 * compares `createdAt` with. A date field gives a day with no time zone (`2026-10-31`); in Paris
 * that day begins at `2026-10-30T23:00:00.000Z`. `daysLater` moves to a following day first.
 */
function startOfDay(day: string, daysLater = 0) {
  const date = new Date(`${day}T00:00:00`); // no `Z`: read in the user's time zone

  date.setDate(date.getDate() + daysLater);

  return date.toISOString();
}

/** The request for a URL state: both picked days are included in full. */
export function toJobOfferListQuery(search: JobOfferListSearch): JobOfferListQuery {
  const { createdFrom, createdTo, ...rest } = search;

  return {
    ...rest,
    // `createdAfter` is inclusive: "from 1 October" starts at the beginning of 1 October.
    ...(createdFrom && { createdAfter: startOfDay(createdFrom) }),
    // `createdBefore` is exclusive: "to 31 October" stops at the beginning of 1 November.
    ...(createdTo && { createdBefore: startOfDay(createdTo, 1) }),
  };
}

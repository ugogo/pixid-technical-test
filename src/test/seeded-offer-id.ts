import { apiClient } from '@/shared/api/client';

/** The id of the seeded offer whose title contains `title`. */
export async function seededOfferId(title: string) {
  const { data: jobOfferPage } = await apiClient.GET('/job-offers', {
    params: { query: { titleContains: title } },
  });
  const id = jobOfferPage?.content[0]?.id;

  if (!id) throw new Error(`No seeded offer matches "${title}"`);

  return id;
}

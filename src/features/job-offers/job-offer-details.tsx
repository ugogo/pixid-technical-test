import { Divider, Grid, Paper, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useFormatters } from '@/shared/i18n/use-formatters';

import type { JobOffer } from './job-offer-types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack spacing={1}>
      <Typography component="h2" variant="overline">
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

/** What an offer says: where, how much, and when it moved. */
export function JobOfferDetails({ offer }: { offer: JobOffer }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const { address } = offer.location;
  const salaryEntries = offer.compensation?.salaryEntries ?? [];
  const bonusEntries = offer.compensation?.bonusEntries ?? [];
  const dates = [
    ['created-at', offer.createdAt],
    ['updated-at', offer.updatedAt],
    ['published-at', offer.publishedAt],
    ['closed-at', offer.closedAt],
  ] as const;

  return (
    <Paper sx={{ p: 3 }} variant="outlined">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Section title={t('job-offer.sections.location')}>
            {offer.location.type === 'COMPANY_ADDRESS' || !address ? (
              <Typography>{t('job-offers.list.company-address')}</Typography>
            ) : (
              <Typography component="address" sx={{ fontStyle: 'normal' }}>
                {address.lines?.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
                {[address.postalCode, address.city].filter(Boolean).join(' ')}
                <br />
                {[address.region, address.countryCode].filter(Boolean).join(', ')}
              </Typography>
            )}
          </Section>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Section title={t('job-offer.sections.compensation')}>
            {salaryEntries.length + bonusEntries.length === 0 && (
              <Typography color="text.secondary">{t('job-offer.no-compensation')}</Typography>
            )}
            {salaryEntries.map((entry, index) => (
              <Typography key={`salary-${index}`}>
                {format.money(entry.amount, entry.currency)} {t(`salary-types.${entry.type}`)}
              </Typography>
            ))}
            {bonusEntries.length > 0 && salaryEntries.length > 0 && <Divider />}
            {bonusEntries.map((entry, index) => (
              <Typography key={`bonus-${index}`}>
                {t(`bonus-types.${entry.type}`)}: {format.money(entry.amount, entry.currency)}
                {entry.description && (
                  <Typography
                    color="text.secondary"
                    component="span"
                    sx={{ display: 'block' }}
                    variant="body2"
                  >
                    {entry.description}
                  </Typography>
                )}
              </Typography>
            ))}
          </Section>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Section title={t('job-offer.sections.dates')}>
            <Stack component="dl" spacing={0.5} sx={{ m: 0 }}>
              {dates.map(
                ([label, date]) =>
                  date && (
                    <Stack direction="row" key={label} spacing={1}>
                      <Typography color="text.secondary" component="dt">
                        {t(`job-offer.dates.${label}`)}
                      </Typography>
                      <Typography component="dd" sx={{ m: 0 }}>
                        {format.date(date)}
                      </Typography>
                    </Stack>
                  ),
              )}
            </Stack>
          </Section>
        </Grid>
      </Grid>
    </Paper>
  );
}

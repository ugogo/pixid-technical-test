import { List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { useFormatters } from '@/shared/i18n/use-formatters';
import { Section } from '@/shared/ui/section';

import type { TransitionHistoryEntry } from './job-offer-types';

/** The offer's status changes, newest first, with who made them and why. */
export function JobOfferHistory({ entries }: { entries: TransitionHistoryEntry[] }) {
  const { t } = useTranslation();
  const format = useFormatters();

  return (
    <Paper sx={{ p: 3 }} variant="outlined">
      <Section title={t('job-offer.sections.history')}>
        {entries.length === 0 ? (
          <Typography color="text.secondary">{t('job-offer.history.empty')}</Typography>
        ) : (
          <List aria-label={t('job-offer.sections.history')} disablePadding>
            {entries.toReversed().map((entry) => (
              <ListItem disableGutters divider key={entry.id}>
                <ListItemText
                  primary={t('job-offer.history.change', {
                    from: t(`status.${entry.fromStatus}`),
                    to: t(`status.${entry.toStatus}`),
                  })}
                  secondary={
                    <>
                      {t('job-offer.history.by', {
                        user: entry.performedBy,
                        date: format.dateTime(entry.performedAt),
                      })}
                      {entry.reason && (
                        <>
                          <br />
                          {t('job-offer.history.reason', { reason: entry.reason })}
                        </>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Section>
    </Paper>
  );
}

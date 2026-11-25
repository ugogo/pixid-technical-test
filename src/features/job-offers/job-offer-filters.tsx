import { Button, Chip, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { JOB_OFFER_STATUSES } from '@/shared/api/enums';
import { DebouncedTextField } from '@/shared/ui/debounced-text-field';

import type { JobOfferListSearch } from './job-offer-list-search';

const TEXT_FILTERS = ['titleContains', 'locationCity', 'createdFrom', 'createdTo'] as const;

type TextFilter = (typeof TEXT_FILTERS)[number];

interface JobOfferFiltersProps {
  values: JobOfferListSearch;
  onChange: (changes: Partial<JobOfferListSearch>) => void;
  onReset: () => void;
}

/** Filters a list of offers; text and date filters report once the user pauses typing. */
export function JobOfferFilters({ values, onChange, onReset }: JobOfferFiltersProps) {
  const { t } = useTranslation();
  const hasFilters = values.status.length > 0 || TEXT_FILTERS.some((filter) => values[filter]);

  function textFilter(filter: TextFilter) {
    return {
      onChange: (value: string) => onChange({ [filter]: value || undefined }),
      size: 'small' as const,
      slotProps: { htmlInput: { maxLength: 100 } },
      value: values[filter] ?? '',
    };
  }

  return (
    <Stack
      component="search"
      direction={{ xs: 'column', md: 'row' }}
      sx={{ flexWrap: 'wrap', gap: 2, alignItems: { md: 'center' } }}
    >
      <DebouncedTextField
        {...textFilter('titleContains')}
        label={t('job-offers.filters.title')}
        type="search"
      />
      <DebouncedTextField
        {...textFilter('locationCity')}
        label={t('job-offers.filters.city')}
        type="search"
      />
      <TextField
        label={t('job-offers.filters.status')}
        onChange={(event) => {
          const { value } = event.target;
          const selected: unknown[] = typeof value === 'string' ? value.split(',') : value;

          // In the swagger's order, whatever the click order, so a selection has one URL.
          onChange({ status: JOB_OFFER_STATUSES.filter((status) => selected.includes(status)) });
        }}
        select
        size="small"
        slotProps={{
          select: {
            multiple: true,
            renderValue: () => (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {values.status.map((status) => (
                  <Chip key={status} label={t(`status.${status}`)} size="small" />
                ))}
              </Stack>
            ),
          },
        }}
        sx={{ minWidth: 200 }}
        value={values.status}
      >
        {JOB_OFFER_STATUSES.map((status) => (
          <MenuItem key={status} value={status}>
            {t(`status.${status}`)}
          </MenuItem>
        ))}
      </TextField>
      <DebouncedTextField
        {...textFilter('createdFrom')}
        label={t('job-offers.filters.created-from')}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: values.createdTo } }}
        type="date"
      />
      <DebouncedTextField
        {...textFilter('createdTo')}
        label={t('job-offers.filters.created-to')}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: values.createdFrom } }}
        type="date"
      />
      {hasFilters && (
        <Button onClick={onReset} size="small">
          {t('job-offers.filters.reset')}
        </Button>
      )}
    </Stack>
  );
}

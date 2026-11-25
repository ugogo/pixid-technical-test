import {
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import { isOneOf } from '@/shared/is-one-of';
import { useFormatDate } from '@/shared/i18n/use-format-date';

import { PAGE_SIZES, type JobOfferListSearch } from './job-offer-list-search';
import type { JobOfferPage } from './job-offer-types';
import { StatusChip } from './status-chip';

type SortableColumn = 'title' | 'createdAt' | 'publishedAt';

const COLUMN_COUNT = 5;
const SKELETON_ROWS = 5;

interface JobOfferTableProps {
  /** Undefined while the first page loads. */
  page: JobOfferPage | undefined;
  search: Pick<JobOfferListSearch, 'page' | 'size' | 'sort'>;
  /** True while a new page or filter loads, with the previous rows still shown. */
  isUpdating: boolean;
  onChange: (changes: Partial<JobOfferListSearch>) => void;
}

export function JobOfferTable({ page, search, isUpdating, onChange }: JobOfferTableProps) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const offers = page?.content;

  /** The active column flips; a new one sorts titles A to Z and dates newest first. */
  function sortableHeader(column: SortableColumn, label: string) {
    const direction =
      search.sort === column ? 'asc' : search.sort === `-${column}` ? 'desc' : undefined;
    const ascending = direction === 'desc' || (direction === undefined && column === 'title');

    return (
      <TableCell sortDirection={direction ?? false}>
        <TableSortLabel
          active={direction !== undefined}
          direction={direction ?? 'asc'}
          onClick={() => onChange({ sort: ascending ? column : `-${column}` })}
        >
          {label}
        </TableSortLabel>
      </TableCell>
    );
  }

  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table
          aria-busy={offers === undefined || isUpdating}
          aria-label={t('job-offers.list.title')}
        >
          <TableHead>
            <TableRow>
              {sortableHeader('title', t('job-offers.list.columns.title'))}
              <TableCell>{t('job-offers.list.columns.status')}</TableCell>
              <TableCell>{t('job-offers.list.columns.city')}</TableCell>
              {sortableHeader('createdAt', t('job-offers.list.columns.created-at'))}
              {sortableHeader('publishedAt', t('job-offers.list.columns.published-at'))}
            </TableRow>
          </TableHead>
          <TableBody sx={{ opacity: isUpdating ? 0.6 : 1, transition: 'opacity 150ms' }}>
            {offers === undefined &&
              Array.from({ length: SKELETON_ROWS }, (_row, index) => (
                <TableRow key={index}>
                  {Array.from({ length: COLUMN_COUNT }, (_cell, cell) => (
                    <TableCell key={cell}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {offers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT}>
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    {t('job-offers.list.empty')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {offers?.map((offer) => (
              <TableRow hover key={offer.id}>
                <TableCell>{offer.title}</TableCell>
                <TableCell>
                  <StatusChip status={offer.status} />
                </TableCell>
                <TableCell>{offer.locationCity ?? t('job-offers.list.company-address')}</TableCell>
                <TableCell>{formatDate(offer.createdAt)}</TableCell>
                <TableCell>{offer.publishedAt ? formatDate(offer.publishedAt) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={page?.totalElements ?? 0}
        onPageChange={(_event, nextPage) => onChange({ page: nextPage })}
        onRowsPerPageChange={(event) => {
          const size = Number(event.target.value);

          if (isOneOf(PAGE_SIZES, size)) onChange({ size });
        }}
        page={search.page}
        rowsPerPage={search.size}
        rowsPerPageOptions={PAGE_SIZES}
      />
    </Paper>
  );
}

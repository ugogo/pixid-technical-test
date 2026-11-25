import { Chip, type ChipProps } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { JobOfferStatus } from '@/shared/api/enums';

const STATUS_COLORS: Record<JobOfferStatus, ChipProps['color']> = {
  DRAFT: 'default',
  TO_FINALIZE: 'warning',
  TO_APPROVE: 'info',
  TO_POST: 'secondary',
  PUBLISHED: 'success',
  CLOSED: 'default',
};

export function StatusChip({ status }: { status: JobOfferStatus }) {
  const { t } = useTranslation();

  return (
    <Chip
      color={STATUS_COLORS[status]}
      label={t(`status.${status}`)}
      size="small"
      variant={status === 'CLOSED' ? 'outlined' : 'filled'}
    />
  );
}

import { Alert, Button } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { errorMessageKey } from '@/shared/api/api-request-error';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

import { useDeleteJobOffer } from './api/use-job-offer-mutations';

/** Deletes a draft after a confirmation, then goes back to the list. */
export function DeleteJobOfferButton({ jobOfferId }: { jobOfferId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deletion = useDeleteJobOffer();
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <Button color="error" onClick={() => setIsConfirming(true)} variant="outlined">
        {t('job-offer.delete.button')}
      </Button>
      <ConfirmDialog
        confirmLabel={t('job-offer.delete.button')}
        isPending={deletion.isPending}
        message={t('job-offer.delete.body')}
        onClose={() => setIsConfirming(false)}
        onConfirm={() =>
          deletion.mutate(
            { params: { path: { jobOfferId } } },
            { onSuccess: () => void navigate({ to: '/job-offers' }) },
          )
        }
        open={isConfirming}
        title={t('job-offer.delete.title')}
      >
        {deletion.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t(errorMessageKey(deletion.error))}
          </Alert>
        )}
      </ConfirmDialog>
    </>
  );
}

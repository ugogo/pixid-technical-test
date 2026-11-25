import { Alert, Button } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

import { useDeleteJobOffer } from './api/use-job-offer-mutations';

interface DeleteJobOfferButtonProps {
  jobOfferId: string;
  onDeleted: () => void;
}

/** Deletes a draft after a confirmation; the server's 409 stays the authority on the status. */
export function DeleteJobOfferButton({ jobOfferId, onDeleted }: DeleteJobOfferButtonProps) {
  const { t } = useTranslation();
  const deletion = useDeleteJobOffer(jobOfferId);
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <Button color="error" onClick={() => setIsConfirming(true)} variant="outlined">
        {t('job-offer.delete.button')}
      </Button>
      <ConfirmDialog
        confirmLabel={t('job-offer.delete.button')}
        isPending={deletion.isPending}
        onClose={() => setIsConfirming(false)}
        onConfirm={() => deletion.mutate(undefined, { onSuccess: onDeleted })}
        open={isConfirming}
        title={t('job-offer.delete.title')}
      >
        {t('job-offer.delete.body')}
        {deletion.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t('errors.generic')}
          </Alert>
        )}
      </ConfirmDialog>
    </>
  );
}

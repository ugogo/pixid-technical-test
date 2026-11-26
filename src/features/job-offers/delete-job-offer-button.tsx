import { Button } from '@mui/material';
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
  const deleteJobOffer = useDeleteJobOffer();
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <Button color="error" onClick={() => setIsConfirming(true)} variant="outlined">
        {t('job-offer.delete.button')}
      </Button>
      <ConfirmDialog
        confirmLabel={t('job-offer.delete.button')}
        isPending={deleteJobOffer.isPending}
        message={t('job-offer.delete.body')}
        onClose={() => {
          setIsConfirming(false);
          deleteJobOffer.reset();
        }}
        onConfirm={() =>
          deleteJobOffer.mutate(
            { params: { path: { jobOfferId } } },
            // Replaced, so Back does not lead to the deleted offer.
            { onSuccess: () => void navigate({ to: '/job-offers', replace: true }) },
          )
        }
        open={isConfirming}
        error={deleteJobOffer.error && t(errorMessageKey(deleteJobOffer.error))}
        title={t('job-offer.delete.title')}
      />
    </>
  );
}

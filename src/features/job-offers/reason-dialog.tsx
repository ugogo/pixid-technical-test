import { TextField } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

interface ReasonDialogProps {
  title: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/** Asks why, for a transition the server only accepts with a reason. Mounted only while open. */
export function ReasonDialog({ onConfirm, ...props }: ReasonDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const trimmedReason = reason.trim();

  return (
    <ConfirmDialog
      {...props}
      isConfirmDisabled={trimmedReason === ''}
      onConfirm={() => onConfirm(trimmedReason)}
      open
    >
      <TextField
        fullWidth
        label={t('transitions.reason')}
        margin="dense"
        minRows={3}
        multiline
        onChange={(event) => setReason(event.target.value)}
        required
        slotProps={{ htmlInput: { maxLength: 500 } }}
        value={reason}
      />
    </ConfirmDialog>
  );
}

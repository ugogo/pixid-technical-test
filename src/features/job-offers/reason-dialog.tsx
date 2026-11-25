import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface ReasonDialogProps {
  title: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/** Asks why, for a transition the server only accepts with a reason. Mounted only while open. */
export function ReasonDialog({
  title,
  confirmLabel,
  isPending,
  onConfirm,
  onClose,
}: ReasonDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const trimmedReason = reason.trim();

  return (
    <Dialog
      fullWidth
      onClose={isPending ? undefined : onClose}
      open
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: (event: FormEvent) => {
            event.preventDefault();
            onConfirm(trimmedReason);
          },
        },
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
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
      </DialogContent>
      <DialogActions>
        <Button disabled={isPending} onClick={onClose}>
          {t('app.cancel')}
        </Button>
        <Button disabled={isPending || trimmedReason === ''} type="submit" variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

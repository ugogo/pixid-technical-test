import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { FormEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  /** What will happen, in a sentence. */
  message?: string;
  /** Anything else to show or ask before confirming: a field, an error. */
  children?: ReactNode;
  /** True while the confirmed action runs: both buttons wait. */
  isPending?: boolean;
  /** True while the confirmation cannot be given yet, such as a required field left empty. */
  isConfirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Asks before an action; a form, so Enter in a field confirms. */
export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  message,
  children,
  isPending = false,
  isConfirmDisabled = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      onClose={isPending ? undefined : onClose}
      open={open}
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: (event: FormEvent) => {
            event.preventDefault();
            onConfirm();
          },
        },
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {message && <DialogContentText>{message}</DialogContentText>}
        {children}
      </DialogContent>
      <DialogActions>
        <Button disabled={isPending} onClick={onClose}>
          {t('app.cancel')}
        </Button>
        <Button disabled={isPending || isConfirmDisabled} type="submit" variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

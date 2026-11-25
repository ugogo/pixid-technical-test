import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  children?: ReactNode;
  /** True while the confirmed action runs: both buttons wait. */
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Asks before an action the user may regret; `children` says what will happen. */
export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  children,
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog onClose={isPending ? undefined : onClose} open={open}>
      <DialogTitle>{title}</DialogTitle>
      {children && (
        <DialogContent>
          <DialogContentText component="div">{children}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button disabled={isPending} onClick={onClose}>
          {t('app.cancel')}
        </Button>
        <Button disabled={isPending} onClick={onConfirm} variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

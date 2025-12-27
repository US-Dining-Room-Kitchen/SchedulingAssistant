import React from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  content: {
    whiteSpace: 'pre-wrap',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
});

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional third action button */
  extraAction?: {
    label: string;
    onClick: () => void;
    appearance?: 'primary' | 'secondary' | 'outline' | 'subtle' | 'transparent';
  };
}

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  extraAction,
}: ConfirmDialogProps) {
  const styles = useStyles();
  
  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onCancel()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent className={styles.content}>{message}</DialogContent>
          <DialogActions className={styles.actions}>
            <Button appearance="secondary" onClick={onCancel}>{cancelText}</Button>
            {extraAction && (
              <Button 
                appearance={extraAction.appearance || 'outline'} 
                onClick={extraAction.onClick}
              >
                {extraAction.label}
              </Button>
            )}
            <Button appearance="primary" onClick={onConfirm}>{confirmText}</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

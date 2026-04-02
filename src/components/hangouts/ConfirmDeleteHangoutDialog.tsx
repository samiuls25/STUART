import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface ConfirmDeleteHangoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hangoutTitle: string;
  onConfirm: () => void;
}

const ConfirmDeleteHangoutDialog = ({
  open,
  onOpenChange,
  hangoutTitle,
  onConfirm,
}: ConfirmDeleteHangoutDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-2xl">
        <AlertDialogTitle className="text-destructive">Delete Hangout Event?</AlertDialogTitle>
        <AlertDialogDescription className="space-y-3">
          <p>
            Are you sure you want to delete this hangout event?
          </p>
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-sm text-foreground">
              <strong>{hangoutTitle}</strong> and all responses/availability for it will be removed.
            </p>
          </div>
        </AlertDialogDescription>
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel>Keep Hangout</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Hangout
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDeleteHangoutDialog;

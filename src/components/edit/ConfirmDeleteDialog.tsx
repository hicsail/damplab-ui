import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

export interface PendingDelete<Id = string | number> {
  id: Id;
  /** Shown in the title; a row with no name falls back to the noun. */
  name?: string | null;
}

interface Props {
  /** The row waiting on an answer, or null when nothing is. */
  target: PendingDelete<any> | null;
  /** What is being deleted, lower case: "operation", "bundle". */
  noun: string;
  /** What deleting it does and does not touch. */
  detail?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The question every trash can in the Catalog Editor asks before it deletes.
 * One click on a dense table row used to be enough to remove an operation.
 */
export default function ConfirmDeleteDialog({ target, noun, detail, onCancel, onConfirm }: Props) {
  const name = target?.name?.trim();
  return (
    <Dialog open={!!target} onClose={onCancel}>
      <DialogTitle>{name ? `Delete “${name}”?` : `Delete this ${noun}?`}</DialogTitle>
      <DialogContent>
        <DialogContentText>{detail ?? `This removes the ${noun} from the catalog.`}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color='error' onClick={onConfirm} autoFocus>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

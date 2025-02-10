import { Dialog, Button, DialogContent, DialogActions } from "@mui/material";

interface AlertDialogProps {
    onAccept: () => void;
    onDeny: () => void;
    open: boolean;
    body: string;
}

// This dialog forces the user to make a selection between yes or no. They cannot click out of it otherwise.
export default function AlertDialog (props: AlertDialogProps) {
    const { onAccept, onDeny, open, body} = props;

    return (
        <Dialog open={open}>
            <DialogContent>
                <DialogContent>
                    {body}
                </DialogContent>
            </DialogContent>
            <DialogActions>
                <Button onClick={onDeny} variant="outlined">No</Button>
                <Button onClick={onAccept} variant="contained">Yes</Button>
            </DialogActions>
        </Dialog>
    );
}
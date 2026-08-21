import React, { useState, useContext } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';

import { MUTATE_JOB_STATE, CREATE_COMMENT } from '../gql/mutations';
import { UserContext } from '../contexts/UserContext';

/**
 * Hands an edited job back to the lab.
 *
 * Two steps, in this order: post the customer's note, then move the job to
 * SUBMITTED. If the state change failed after the comment was posted the
 * customer would at least have said something visible; the reverse would leave
 * the technician a job to re-review with no explanation of what changed.
 *
 * This writes no job version — the customer's edits were already versioned when
 * they saved in the workflow editor.
 */

interface Props {
    open: boolean;
    onClose: () => void;
    jobId: string;
    onResubmitted?: () => void;
    /**
     * Approving the lab's edits rather than handing back edits of your own.
     *
     * The same two writes in the same order — say something, then give the job
     * back — so it shares this component rather than forking a near-identical
     * one. Only the wording and the recorded history note differ, because what
     * the customer did differs.
     */
    mode?: 'resubmit' | 'approve';
}

const COPY = {
    resubmit: {
        title: 'Resubmit job',
        blurb:
            'Send your updated workflow back to the DAMP Lab for review. Any edits you saved in the workflow editor are already recorded; add a note to explain what you changed.',
        field: 'Note to the technician (optional)',
        submit: 'Resubmit updated job to technician',
        pending: 'Resubmitting…',
        historyNote: 'Resubmitted',
        defaultComment: 'Resubmitted to the DAMP Lab.',
        failure: 'Could not resubmit the job.'
    },
    approve: {
        title: 'Approve the lab’s edits',
        blurb:
            'Confirm that the workflow as it now stands is what you want the DAMP Lab to run. This hands the job back to the lab; you can add a note if anything still needs saying.',
        field: 'Note to the technician (optional)',
        submit: 'Approve and return to the lab',
        pending: 'Approving…',
        historyNote: 'Approved by customer',
        defaultComment: 'The client approved the job.',
        failure: 'Could not approve the job.'
    }
} as const;

export default function ResubmitJobModal({ open, onClose, jobId, onResubmitted, mode = 'resubmit' }: Props): React.JSX.Element {
    const copy = COPY[mode];
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mutateJobState] = useMutation(MUTATE_JOB_STATE);
    const [createComment] = useMutation(CREATE_COMMENT);
    const { userProps } = useContext(UserContext);

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            // Always posted. An approval with no note is still the customer
            // saying yes, and that has to be on the record the same way a staff
            // decision is.
            await createComment({
                variables: {
                    input: {
                        jobId,
                        content: message.trim() || copy.defaultComment,
                        author: userProps?.idTokenParsed?.email ?? '',
                        authorType: 'CLIENT',
                        isInternal: false
                    }
                }
            });

            await mutateJobState({ variables: { ID: jobId, State: 'SUBMITTED', Note: copy.historyNote } });

            setMessage('');
            onClose();
            onResubmitted?.();
        } catch (err: any) {
            setError(err?.message ?? copy.failure);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {copy.blurb}
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label={copy.field}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Box sx={{ display: 'flex', gap: 1, px: 1, pb: 1 }}>
                    <Button onClick={onClose} color="inherit" disabled={submitting}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? copy.pending : copy.submit}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}

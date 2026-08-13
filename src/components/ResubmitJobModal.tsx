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
}

export default function ResubmitJobModal({ open, onClose, jobId, onResubmitted }: Props): React.JSX.Element {
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
            if (message.trim()) {
                await createComment({
                    variables: {
                        input: {
                            jobId,
                            content: message.trim(),
                            author: userProps?.idTokenParsed?.email ?? '',
                            authorType: 'CLIENT',
                            isInternal: false
                        }
                    }
                });
            }

            await mutateJobState({ variables: { ID: jobId, State: 'SUBMITTED' } });

            setMessage('');
            onClose();
            onResubmitted?.();
        } catch (err: any) {
            setError(err?.message ?? 'Could not resubmit the job.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Resubmit job</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Send your updated workflow back to the DAMP Lab for review. Any edits you saved in the
                    workflow editor are already recorded; add a note to explain what you changed.
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Note to the technician (optional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Box sx={{ display: 'flex', gap: 1, px: 1, pb: 1 }}>
                    <Button onClick={onClose} color="inherit" disabled={submitting}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Resubmitting…' : 'Resubmit updated job to technician'}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}

import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';

import { RESPOND_TO_JOB_REVIEW } from '../gql/mutations';
import { buildReviewResponseInput, retryOperationId, reviewResponseCopy, type CustomerActionRequired } from '../utils/jobReview';

interface Props {
    open: boolean;
    onClose: () => void;
    jobId: string;
    onResubmitted?: () => void;
    action: CustomerActionRequired;
}

export default function ResubmitJobModal({ open, onClose, jobId, onResubmitted, action }: Props): React.JSX.Element {
    const copy = reviewResponseCopy(action);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const operationIdRef = useRef<string | null>(null);

    const [respondToReview] = useMutation(RESPOND_TO_JOB_REVIEW);

    useEffect(() => {
        if (open) {
            setMessage('');
            setError(null);
            operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'reopen' });
        }
    }, [open, jobId, action]);

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'submit', candidate: crypto.randomUUID() });
            await respondToReview({
                variables: {
                    input: buildReviewResponseInput({
                        operationId: operationIdRef.current,
                        jobId,
                        action,
                        message
                    })
                }
            });

            await onResubmitted?.();
            operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'success' });
            setMessage('');
            onClose();
        } catch (err: any) {
            operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'failure' });
            setError(err?.message ?? copy.failure);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => {
                if (!submitting) onClose();
            }}
            disableEscapeKeyDown={submitting}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {copy.body}
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label={copy.fieldLabel}
                    value={message}
                    onChange={(e) => {
                        operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'edit' });
                        setMessage(e.target.value);
                    }}
                    required={copy.messageRequired}
                    disabled={submitting}
                />
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Box sx={{ display: 'flex', gap: 1, px: 1, pb: 1 }}>
                    <Button onClick={onClose} color="inherit" disabled={submitting}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={submitting || (copy.messageRequired && !message.trim())}>
                        {submitting ? copy.pendingLabel : copy.submitLabel}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}

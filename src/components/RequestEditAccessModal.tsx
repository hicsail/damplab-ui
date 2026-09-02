import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';

import { REQUEST_JOB_EDIT_ACCESS } from '../gql/mutations';
import { buildEditAccessRequestInput, retryOperationId } from '../utils/jobReview';
import { formatGqlError } from '../utils/gqlError';

interface Props {
    open: boolean;
    onClose: () => void;
    jobId: string;
    onRequested?: () => Promise<unknown> | void;
}

/**
 * Asks the lab to open the workflow editor.
 *
 * Deliberately not a ReasonDialog: that component requires a non-empty reason
 * and keeps its confirm disabled without one, which is right for refusing
 * something and wrong for asking a question. Requesting access is allowed with
 * no note at all.
 */
export default function RequestEditAccessModal({ open, onClose, jobId, onRequested }: Props): React.JSX.Element {
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const operationIdRef = useRef<string | null>(null);

    const [requestEditAccess] = useMutation(REQUEST_JOB_EDIT_ACCESS);

    useEffect(() => {
        if (open) {
            setMessage('');
            setError(null);
            operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'reopen' });
        }
    }, [open, jobId]);

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'submit', candidate: crypto.randomUUID() });
            await requestEditAccess({
                variables: {
                    input: buildEditAccessRequestInput({ operationId: operationIdRef.current, jobId, message })
                }
            });

            await onRequested?.();
            operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'success' });
            setMessage('');
            onClose();
        } catch (err) {
            operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'failure' });
            setError(formatGqlError(err, 'Could not send your request.'));
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
            <DialogTitle>Request edit access</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Ask the DAMP Lab to open this job&rsquo;s workflow so you can change it. The lab will review your request and reply in the comments — the
                    editor opens only once they grant it.
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="What would you like to change? (optional)"
                    value={message}
                    onChange={(e) => {
                        operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'edit' });
                        setMessage(e.target.value);
                    }}
                    disabled={submitting}
                />
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Box sx={{ display: 'flex', gap: 1, px: 1, pb: 1 }}>
                    <Button onClick={onClose} color="inherit" disabled={submitting}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Sending…' : 'Request edit access'}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}

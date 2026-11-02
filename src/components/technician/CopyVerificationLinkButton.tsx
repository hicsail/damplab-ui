import React, { useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, TextField, Tooltip, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { copyVerificationLink, type CopyVerificationOutcome } from './copyVerificationLink';

/** The one label for every control that copies the customer's verification link. */
export const COPY_VERIFICATION_LINK = 'Copy verification link';

type Props = {
  /** The job has an Aclid screen. The server refuses to open one just to mint a link. */
  hasScreen: boolean;
  /** Mints a fresh hosted verification URL (startJobCustomerVerification). */
  mint: () => Promise<string>;
  sx?: SxProps<Theme>;
};

/**
 * Staff copy Aclid's hosted KYC page link to send to the customer. Not the customer-screening
 * leg, and not the embed: the customer runs their own verification.
 */
export default function CopyVerificationLinkButton({ hasScreen, mint, sx }: Props): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<CopyVerificationOutcome | null>(null);
  const [copiedOpen, setCopiedOpen] = useState(false);
  const urlField = useRef<HTMLInputElement | null>(null);

  const onClick = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    const result = await copyVerificationLink(mint, typeof navigator !== 'undefined' ? navigator.clipboard?.writeText?.bind(navigator.clipboard) : undefined);
    setBusy(false);
    if (result.kind === 'copied') setCopiedOpen(true);
    else setOutcome(result);
  };

  return (
    <>
      <Tooltip title={hasScreen ? '' : 'Run screening first'}>
        {/* A disabled button swallows hover; the span carries the tooltip. */}
        <span style={{ display: 'block' }}>
          <Button variant="outlined" size="small" sx={sx} disabled={!hasScreen || busy} onClick={onClick}>
            {busy ? 'Copying…' : COPY_VERIFICATION_LINK}
          </Button>
        </span>
      </Tooltip>
      <Snackbar open={copiedOpen} autoHideDuration={3000} onClose={() => setCopiedOpen(false)} message="Verification link copied" />
      <Dialog open={outcome !== null} onClose={() => setOutcome(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{COPY_VERIFICATION_LINK}</DialogTitle>
        <DialogContent>
          {outcome?.kind === 'error' && <Alert severity="error">{outcome.message}</Alert>}
          {outcome?.kind === 'manual' && (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                The browser would not copy it. Copy this link for the customer:
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={outcome.url}
                inputRef={urlField}
                autoFocus
                onFocus={(e) => e.target.select()}
                slotProps={{ htmlInput: { readOnly: true, 'aria-label': 'Verification link' } }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutcome(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

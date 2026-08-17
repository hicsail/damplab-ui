import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { consentSummaryLabels, SowConsent } from './sowTypes';

/**
 * What a signature actually covers: the groups agreed to and any per-section
 * initials, plus who and when. Shared between the customer's own view of their
 * signature and the staff-side status card, so both read the same record the
 * same way.
 */

interface Props {
  clientSignature?: SowConsent | null;
  staffSignature?: SowConsent | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function SowSignaturesSummary({ clientSignature, staffSignature }: Props): React.JSX.Element | null {
  if (!clientSignature) return null;

  return (
    <Box>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mb: staffSignature ? 1.5 : 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {clientSignature.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Signed {formatDate(clientSignature.signedAt)}
        </Typography>
        {consentSummaryLabels(clientSignature.consentedGroups).map((label) => (
          <Typography key={label} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleOutlineIcon fontSize="inherit" color="success" /> Agreed to {label}
          </Typography>
        ))}
        {(clientSignature.sectionInitials ?? []).map((s) => (
          <Typography key={s.key} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleOutlineIcon fontSize="inherit" color="success" /> Initialled &ldquo;{s.label}&rdquo;: {s.initials}
          </Typography>
        ))}
      </Box>

      {staffSignature && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {staffSignature.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Countersigned for DAMP Lab on {formatDate(staffSignature.signedAt)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

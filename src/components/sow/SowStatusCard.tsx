import React from 'react';
import { useQuery } from '@apollo/client';
import { Alert, AlertTitle, Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { GET_SOW_EDITOR_STATE } from '../../gql/queries';
import SowPdfDocument from './SowPdfDocument';
import SowSignaturesSummary from './SowSignaturesSummary';
import { blockerStep, type DocumentBlocker, SETTLED_BLOCKERS, SowEditorState, sowStatusLabel, statusColor, versionDisplayLabel } from './sowTypes';

/**
 * Staff-side summary of a job's SOW: where it stands, who has signed, and whether
 * anything needs attention.
 *
 * The status shown is the version in force with the customer, not the newest
 * version — a draft in progress is reported separately, because "what is the
 * customer bound by" and "what are we working on" are different questions.
 */

interface Props {
  jobId: string;
  onOpenEditor: () => void;
}

export default function SowStatusCard({ jobId, onOpenEditor }: Props): React.JSX.Element | null {
  const { data } = useQuery(GET_SOW_EDITOR_STATE, { variables: { jobId }, skip: !jobId, fetchPolicy: 'cache-and-network' });
  const sow: SowEditorState | null = data?.sowByJobId ?? null;
  if (!sow) return null;

  const active = (sow.versions ?? []).find((v) => v.versionNumber === sow.activeVersionNumber) ?? null;
  const current = sow.currentVersion ?? null;
  const hasUnsentDraft = sow.currentVersionNumber > sow.activeVersionNumber;
  // The card is the pre-editor view, so it shows whichever stage the SOW is
  // actually waiting on. Same ordering as the editor's button (nextSowAction): an
  // outstanding draft has to go out first, so it is only a countersignature the
  // SOW is waiting on once nothing newer sits above the signed version.
  const awaitingCountersignature = !hasUnsentDraft && sow.activeVersion?.status === 'SIGNED';
  const gate = sow.actionGate;
  // "Already issued" and "waiting on the customer" are states, not chores. Listing
  // them under "Not ready to send" produced a banner on a countersigned SOW whose
  // only item was a blocker with no staff-facing step attached to it.
  const blockers = ((awaitingCountersignature ? gate?.countersignBlockers : gate?.sendBlockers) ?? []).filter(
    (b: DocumentBlocker) => !SETTLED_BLOCKERS.includes(b)
  );
  const missingFields = gate?.missingFields ?? [];
  const forPdf = active ?? current;

  return (
    <Box sx={{ mx: 3, my: 2 }}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Statement of Work
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sow.sowNumber}
            </Typography>
            {active ? (
              <Chip size="small" label={`${versionDisplayLabel(active)} · ${sowStatusLabel(active.status)}`} color={statusColor(active.status)} />
            ) : (
              <Chip size="small" label="Not sent yet" />
            )}
            {hasUnsentDraft && <Chip size="small" variant="outlined" label={`Draft ${versionDisplayLabel(current)} in progress`} />}
          </Box>

          {/* One banner, not several: the blockers arrive in the order they should
              be cleared, so they read as a repair sequence rather than as a set of
              independent alarms. */}
          {blockers.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              <AlertTitle>{awaitingCountersignature ? 'Not ready to countersign' : 'Not ready to send'}</AlertTitle>
              <Box component="ol" sx={{ pl: 2.5, m: 0 }}>
                {blockers.map((b: DocumentBlocker) => (
                  <li key={b}>
                    <Typography variant="body2">
                      {blockerStep(b)}
                      {b === 'DRAFT_INCOMPLETE' && missingFields.length > 0 && ` (${missingFields.join(', ')})`}
                    </Typography>
                  </li>
                ))}
              </Box>
            </Alert>
          )}

          {active?.clientSignature && (
            <Box sx={{ mb: 1.5 }}>
              <SowSignaturesSummary clientSignature={active.clientSignature} staffSignature={active.staffSignature} />
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Button variant="contained" startIcon={<DescriptionIcon />} onClick={onOpenEditor}>
              Edit SOW
            </Button>
            {forPdf && (
              <PDFDownloadLink
                document={<SowPdfDocument version={forPdf} sowNumber={sow.sowNumber} />}
                fileName={`${sow.sowNumber.replace(/\s+/g, '-')}-v${versionDisplayLabel(forPdf)}.pdf`}
                style={{ textDecoration: 'none' }}
              >
                {({ loading }) => (
                  <Button variant="outlined" disabled={loading}>
                    {loading ? 'Preparing PDF…' : 'Download PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

import React from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, AlertTitle, Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { GET_SOW_EDITOR_STATE } from '../../gql/queries';
import { CANCEL_SOW, WITHDRAW_SOW_FROM_CUSTOMER } from '../../gql/mutations';
import SowPdfDocument from './SowPdfDocument';
import SowSignaturesSummary from './SowSignaturesSummary';
import { blockerStep, type DocumentBlocker, SowEditorState, sowStatusLabel, statusColor, versionDisplayLabel } from './sowTypes';
import { cancelIsOffered, statusCardRepair } from './sowEditorView';
import ReasonDialog from '../ReasonDialog';

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
  const { data, refetch } = useQuery(GET_SOW_EDITOR_STATE, { variables: { jobId }, skip: !jobId, fetchPolicy: 'cache-and-network' });
  const sow: SowEditorState | null = data?.sowByJobId ?? null;

  // Every hook runs before the early return below, so the hook count cannot
  // change between a render with a SOW and one without.
  const [withdrawSow] = useMutation(WITHDRAW_SOW_FROM_CUSTOMER);
  const [cancelSow] = useMutation(CANCEL_SOW);
  const [busy, setBusy] = React.useState(false);
  const [confirming, setConfirming] = React.useState<'withdraw' | 'cancel' | null>(null);

  const confirmCopy = {
    withdraw: {
      title: 'Withdraw this Statement of Work from the client?',
      warning:
        'They will no longer be able to sign it, and will be told why.\n\nThe version they were sent stays in the history, and you get an editable copy of it back to revise and reissue.',
      confirmLabel: 'Withdraw from client'
    },
    cancel: {
      title: 'Cancel this Statement of Work?',
      warning:
        'It stops being in effect and the client is told.\n\nEvery version stays in the history. If the work later goes ahead on new terms you can edit this document and issue it again — a job has one Statement of Work, and revisions are new versions of it.',
      confirmLabel: 'Cancel SOW'
    }
  } as const;

  const handleConfirm = async (reason: string): Promise<void> => {
    if (!sow || !confirming) return;
    setBusy(true);
    try {
      if (confirming === 'withdraw') await withdrawSow({ variables: { sowId: sow.id, reason } });
      else await cancelSow({ variables: { sowId: sow.id, note: reason } });
      await refetch();
      setConfirming(null);
    } catch (e: any) {
      window.alert(e?.message ?? 'Could not update the Statement of Work.');
    } finally {
      setBusy(false);
    }
  };

  if (!sow) return null;

  const active = (sow.versions ?? []).find((v) => v.versionNumber === sow.activeVersionNumber) ?? null;
  const current = sow.currentVersion ?? null;
  const hasUnsentDraft = sow.currentVersionNumber > sow.activeVersionNumber;
  const gate = sow.actionGate;
  const repair = statusCardRepair({
    currentStatus: current?.status,
    activeStatus: sow.activeVersion?.status,
    hasUnsentDraft,
    gate
  });
  const missingFields = gate?.missingFields ?? [];
  const outWithCustomer = sow.activeVersion?.status === 'SENT';
  const everIssued = cancelIsOffered(sow.versions);
  const alreadyCancelled = current?.status === 'CANCELLED';
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
          {repair && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              <AlertTitle>{repair.title}</AlertTitle>
              <Box component="ol" sx={{ pl: 2.5, m: 0, width: '100%' }}>
                {repair.blockers.map((b: DocumentBlocker) => (
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
            <Button variant="contained" startIcon={<DescriptionIcon />} onClick={onOpenEditor} disabled={outWithCustomer}>
              Edit SOW
            </Button>
            {/* A document out for signature belongs to the customer until they
                act on it or the lab takes it back. Editing it behind their back
                is what the withdrawal replaces. */}
            {outWithCustomer && (
              <Button variant="outlined" color="warning" onClick={() => setConfirming('withdraw')} disabled={busy} sx={{ textTransform: 'none' }}>
                Withdraw from client
              </Button>
            )}
            {/* Retiring the document, as distinct from taking it back to edit.
                Available even when the job's acceptance has been withdrawn,
                which is the state where a SOW would otherwise be stranded. */}
            {everIssued && !alreadyCancelled && (
              <Button variant="outlined" color="error" onClick={() => setConfirming('cancel')} disabled={busy} sx={{ textTransform: 'none' }}>
                Cancel SOW
              </Button>
            )}
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

      {confirming && (
        <ReasonDialog
          open
          title={confirmCopy[confirming].title}
          warning={confirmCopy[confirming].warning}
          confirmLabel={confirmCopy[confirming].confirmLabel}
          busy={busy}
          onCancel={() => setConfirming(null)}
          onConfirm={handleConfirm}
        />
      )}
    </Box>
  );
}

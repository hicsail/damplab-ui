import React from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, AlertTitle, Box, Chip, Typography } from '@mui/material';
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

const CONFIRM_COPY = {
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

export function useSowStaffStatus(jobId: string) {
  const { data, refetch, loading } = useQuery(GET_SOW_EDITOR_STATE, {
    variables: { jobId },
    skip: !jobId,
    fetchPolicy: 'cache-and-network'
  });
  const sow: SowEditorState | null = data?.sowByJobId ?? null;

  const [withdrawSow] = useMutation(WITHDRAW_SOW_FROM_CUSTOMER);
  const [cancelSow] = useMutation(CANCEL_SOW);
  const [busy, setBusy] = React.useState(false);
  const [confirming, setConfirming] = React.useState<'withdraw' | 'cancel' | null>(null);

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

  const active = (sow?.versions ?? []).find((v) => v.versionNumber === sow?.activeVersionNumber) ?? null;
  const current = sow?.currentVersion ?? null;
  const hasUnsentDraft = !!sow && sow.currentVersionNumber > sow.activeVersionNumber;
  const gate = sow?.actionGate;
  const repair = sow
    ? statusCardRepair({
        currentStatus: current?.status,
        activeStatus: sow.activeVersion?.status,
        hasUnsentDraft,
        gate
      })
    : null;
  const missingFields = gate?.missingFields ?? [];
  const outWithCustomer = sow?.activeVersion?.status === 'SENT';
  const everIssued = cancelIsOffered(sow?.versions);
  const alreadyCancelled = current?.status === 'CANCELLED';
  const forPdf = active ?? current;

  const dialog = confirming ? (
    <ReasonDialog
      open
      title={CONFIRM_COPY[confirming].title}
      warning={CONFIRM_COPY[confirming].warning}
      confirmLabel={CONFIRM_COPY[confirming].confirmLabel}
      busy={busy}
      onCancel={() => setConfirming(null)}
      onConfirm={handleConfirm}
    />
  ) : null;

  return {
    loading,
    sow,
    active,
    current,
    hasUnsentDraft,
    repair,
    missingFields,
    outWithCustomer,
    everIssued,
    alreadyCancelled,
    forPdf,
    busy,
    requestWithdraw: () => setConfirming('withdraw'),
    requestCancel: () => setConfirming('cancel'),
    dialog
  };
}

export function SowStatusSummary({
  sow,
  active,
  current,
  hasUnsentDraft
}: {
  sow: SowEditorState | null;
  active: ReturnType<typeof useSowStaffStatus>['active'];
  current: ReturnType<typeof useSowStaffStatus>['current'];
  hasUnsentDraft: boolean;
}): React.JSX.Element {
  if (!sow) {
    return (
      <Box>
        <Typography variant="subtitle1" fontWeight={600}>
          Not generated yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Generate a Statement of Work to price this job and send it to the customer.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {sow.sowNumber}
        </Typography>
        {active ? (
          <Chip size="small" label={`${versionDisplayLabel(active)} · ${sowStatusLabel(active.status)}`} color={statusColor(active.status)} />
        ) : (
          <Chip size="small" label="Not sent yet" />
        )}
        {hasUnsentDraft && <Chip size="small" variant="outlined" label={`Draft ${versionDisplayLabel(current)} in progress`} />}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {active
          ? `Customer is bound by ${versionDisplayLabel(active)}.`
          : 'Nothing is in force with the customer yet.'}
      </Typography>
    </Box>
  );
}

export function SowStatusDetails({
  repair,
  missingFields,
  active
}: {
  repair: ReturnType<typeof useSowStaffStatus>['repair'];
  missingFields: string[];
  active: ReturnType<typeof useSowStaffStatus>['active'];
}): React.JSX.Element {
  if (!repair && !active?.clientSignature) {
    return (
      <Typography variant="body2" color="text.secondary">
        No further Statement of Work details right now.
      </Typography>
    );
  }

  return (
    <Box>
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
        <SowSignaturesSummary clientSignature={active.clientSignature} staffSignature={active.staffSignature} />
      )}
    </Box>
  );
}

export function SowPdfDownloadButton({
  sowNumber,
  version,
  button
}: {
  sowNumber: string;
  version: NonNullable<ReturnType<typeof useSowStaffStatus>['forPdf']>;
  button: (label: string, loading: boolean) => React.ReactNode;
}): React.JSX.Element {
  return (
    <PDFDownloadLink
      document={<SowPdfDocument version={version} sowNumber={sowNumber} />}
      fileName={`${sowNumber.replace(/\s+/g, '-')}-v${versionDisplayLabel(version)}.pdf`}
      style={{ textDecoration: 'none', width: '100%' }}
    >
      {({ loading }) => button(loading ? 'Preparing PDF…' : 'Download PDF', loading)}
    </PDFDownloadLink>
  );
}

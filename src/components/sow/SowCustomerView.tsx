import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Divider, FormControlLabel, TextField, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { GET_SOW_EDITOR_STATE } from '../../gql/queries';
import { ASK_SOW_QUESTION, SIGN_SOW } from '../../gql/mutations';
import SowDiffText from './SowDiffText';
import SowVersionHistory from './SowVersionHistory';
import SowPdfDocument from './SowPdfDocument';
import { diffVersions, previousCustomerVersion } from '../../utils/sowDiff';
import { SowEditorState, SowField, SowFieldKind, statusColor } from './sowTypes';

/**
 * The customer's view of a Statement of Work.
 *
 * Read-only by construction: there is no edit affordance anywhere, and the server
 * only ever hands this component versions that were actually issued. What the
 * customer can do is understand what changed, ask about it, and sign.
 */

interface Props {
  jobId: string;
}

/** Consent is per group, so the record says which kinds of content they agreed to. */
const GROUP_COPY: Record<SowFieldKind, { label: string; help: string }> = {
  CALCULATED: { label: 'the dates, people and costs', help: 'Period of performance, team, scope, deliverables and the fee schedule.' },
  PROSE: { label: 'the standard terms', help: 'Responsibilities, invoicing, completion criteria and change control.' },
  CUSTOM: { label: 'the additional sections', help: 'Sections the lab added specifically for this project.' }
};

const GROUP_ORDER: SowFieldKind[] = ['CALCULATED', 'PROSE', 'CUSTOM'];

export default function SowCustomerView({ jobId }: Props): React.JSX.Element | null {
  const { data, loading, refetch } = useQuery(GET_SOW_EDITOR_STATE, { variables: { jobId }, skip: !jobId, fetchPolicy: 'cache-and-network' });
  const [signSow] = useMutation(SIGN_SOW);
  const [askQuestion] = useMutation(ASK_SOW_QUESTION);

  const sow: SowEditorState | null = data?.sowByJobId ?? null;
  // The server returns only issued versions to a customer, so this history is
  // already what they are allowed to see.
  const history = useMemo(() => sow?.versions ?? [], [sow?.versions]);

  const [viewing, setViewing] = useState<number | null>(null);
  const [consent, setConsent] = useState<Set<SowFieldKind>>(new Set());
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null);

  const activeNumber = sow?.activeVersionNumber ?? 0;

  useEffect(() => {
    if (activeNumber) setViewing(activeNumber);
  }, [activeNumber]);

  const version = useMemo(() => history.find((v) => v.versionNumber === (viewing ?? activeNumber)) ?? null, [history, viewing, activeNumber]);

  // Always compared against the previous version they were sent, never against a
  // draft they never saw.
  const baseline = useMemo(() => (version ? previousCustomerVersion(history, version.versionNumber) : null), [history, version]);
  const diff = useMemo(() => {
    if (!version || baseline == null) return null;
    return diffVersions(history.find((v) => v.versionNumber === baseline) ?? null, version);
  }, [history, version, baseline]);
  const diffByKey = useMemo(() => new Map((diff?.fields ?? []).map((f) => [f.key, f])), [diff]);

  const visible: SowField[] = useMemo(() => (version?.fields ?? []).filter((f) => f.isEnabled).sort((a, b) => a.order - b.order), [version]);

  // Only ask about groups the document actually contains.
  const groups = useMemo(() => GROUP_ORDER.filter((g) => visible.some((f) => f.kind === g)), [visible]);

  const isCurrent = !!version && version.versionNumber === activeNumber;
  const awaitingSignature = isCurrent && version?.status === 'SENT';
  const signedName = version?.clientSignature?.name;

  useEffect(() => setConsent(new Set()), [version?.id]);

  if (!loading && !sow) return null;

  const allConsented = groups.every((g) => consent.has(g));
  const canSign = awaitingSignature && allConsented && name.trim().length > 0 && !busy;

  const handleSign = async (): Promise<void> => {
    if (!sow || !version) return;
    setBusy(true);
    setBanner(null);
    try {
      await signSow({ variables: { sowId: sow.id, input: { versionNumber: version.versionNumber, name: name.trim(), consentedGroups: [...consent] } } });
      await refetch();
      setName('');
      setBanner({ severity: 'success', text: 'Thank you — your signature has been recorded.' });
    } catch (e: any) {
      setBanner({ severity: 'error', text: e?.message ?? 'The signature could not be recorded.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAsk = async (): Promise<void> => {
    if (!sow || !question.trim()) return;
    setBusy(true);
    try {
      await askQuestion({ variables: { sowId: sow.id, text: question.trim() } });
      await refetch();
      setQuestion('');
      setBanner({ severity: 'success', text: 'Your question has been sent to the lab.' });
    } catch (e: any) {
      setBanner({ severity: 'error', text: e?.message ?? 'The question could not be sent.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ mx: 3, my: 2 }}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Statement of Work
            </Typography>
            {sow?.sowNumber && <Typography variant="body2" color="text.secondary">{sow.sowNumber}</Typography>}
            {version && <Chip size="small" label={`v${version.versionNumber} · ${version.status}`} color={statusColor(version.status)} />}
            {version && (
              <PDFDownloadLink
                document={<SowPdfDocument version={version} sowNumber={sow?.sowNumber} />}
                fileName={`${(sow?.sowNumber ?? 'SOW').replace(/\s+/g, '-')}-v${version.versionNumber}.pdf`}
                style={{ textDecoration: 'none' }}
              >
                {({ loading: pdfLoading }) => (
                  <Button size="small" variant="outlined" disabled={pdfLoading}>
                    {pdfLoading ? 'Preparing…' : 'Download a copy'}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </Box>

          {loading && !sow && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {banner && (
            <Alert severity={banner.severity} sx={{ mb: 2 }} onClose={() => setBanner(null)}>
              {banner.text}
            </Alert>
          )}

          {sow && activeNumber === 0 && <Alert severity="info">The lab is still preparing your Statement of Work. You will be able to review and sign it here.</Alert>}

          {version && (
            <>
              {history.length > 1 && (
                <Box sx={{ mb: 2 }}>
                  <SowVersionHistory versions={history} viewing={version.versionNumber} baseline={baseline} onViewingChange={setViewing} onBaselineChange={() => undefined} lockBaseline />
                </Box>
              )}

              {!isCurrent && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  This is an earlier version, kept for your records. Version {activeNumber} is the current one.
                </Alert>
              )}

              {signedName && (
                <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 2 }}>
                  Signed by {signedName}
                  {version.clientSignature?.signedAt ? ` on ${new Date(version.clientSignature.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}.
                  {version.staffSignature?.name ? ` Countersigned by ${version.staffSignature.name}.` : ''}
                </Alert>
              )}

              {diff?.hasChanges && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This version differs from the one you were sent previously. The changes are marked below.
                </Alert>
              )}

              {/* The document */}
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {visible.map((f) => {
                  const d = diffByKey.get(f.key);
                  const changed = d && d.kind !== 'unchanged';
                  return (
                    <Box key={f.key} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', borderLeft: '3px solid', borderLeftColor: changed ? 'info.main' : 'transparent', '&:last-of-type': { borderBottom: 'none' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }} data-verbatim-text>
                          {f.label}
                        </Typography>
                        {changed && <Chip size="small" label={d?.kind === 'added' ? 'New' : 'Changed'} color="info" variant="outlined" />}
                      </Box>
                      {d?.kind === 'changed' && d.parts ? (
                        <SowDiffText parts={d.parts} />
                      ) : (
                        <Box data-verbatim-text sx={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>
                          {f.value}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* Signing */}
              {awaitingSignature && !signedName && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Sign this Statement of Work
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Confirm each part of the document, then type your full name.
                  </Typography>

                  {groups.map((g) => (
                    <Box key={g} sx={{ mb: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={consent.has(g)}
                            onChange={(e) =>
                              setConsent((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(g);
                                else next.delete(g);
                                return next;
                              })
                            }
                          />
                        }
                        label={<span>I have read and agree to {GROUP_COPY[g].label}</span>}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mt: -0.5 }}>
                        {GROUP_COPY[g].help}
                      </Typography>
                    </Box>
                  ))}

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2, flexWrap: 'wrap' }}>
                    <TextField size="small" label="Your full name" value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 260 }} disabled={busy} />
                    <Button variant="contained" onClick={handleSign} disabled={!canSign}>
                      Sign
                    </Button>
                  </Box>
                  {!allConsented && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Confirm every section above to enable signing.</Typography>}
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Questions */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Questions
              </Typography>
              {(sow?.questions ?? []).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Ask the lab anything about this document before you sign.
                </Typography>
              ) : (
                <Box sx={{ mb: 1.5 }}>
                  {(sow?.questions ?? []).map((q, i) => (
                    <Box key={i} sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {q.isStaff ? 'DAMP Lab' : q.authorName}
                        {q.versionNumber ? ` · v${q.versionNumber}` : ''} · {new Date(q.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {q.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <TextField size="small" multiline minRows={2} placeholder="Type your question" value={question} onChange={(e) => setQuestion(e.target.value)} sx={{ flex: 1, minWidth: 260 }} disabled={busy} />
                <Button variant="outlined" onClick={handleAsk} disabled={busy || !question.trim()}>
                  Send question
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

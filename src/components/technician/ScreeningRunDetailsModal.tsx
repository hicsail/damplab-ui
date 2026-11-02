import React, { Fragment, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, CircularProgress, Collapse, IconButton, Modal, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { ScreeningBatch } from '../../securedna/types';
import { ScreeningBatchDetailsContent } from '../ScreeningBatchDetailsModal';
import { biosecurityStatusLabel } from './biosecurityStatus';
import type { ScreeningRunDetail } from './screeningRunTypes';
import {
  aclidFindingRows, DETAILS_NOT_AVAILABLE_TEXT, type FindingRow, materialRows, regulatoryLabel, screeningRunOptionLabel, screeningRunSecondary,
  secureDnaHitCounts, sequenceMatchGroup
} from './screeningRunView';

const fmt = (n: number | null, digits = 2): string => (n === null ? '—' : String(Math.round(n * 10 ** digits) / 10 ** digits));
const pct = (n: number | null): string => (n === null ? '—' : `${fmt(n, 1)}%`);

function FindingsTable({ rows }: { rows: FindingRow[] }): React.JSX.Element {
  if (rows.length === 0) return <Typography variant="body2" color="text.secondary">No findings.</Typography>;
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Framework</TableCell>
          <TableCell>Reason code</TableCell>
          <TableCell>Regulatory status</TableCell>
          <TableCell>Material</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.framework}>
            <TableCell>{row.frameworkLabel}</TableCell>
            <TableCell>
              {row.reasonCode ? (
                <Tooltip title={row.reasonDescription ?? ''}>
                  <span>{row.reasonCode}</span>
                </Tooltip>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell>{regulatoryLabel(row.regulatoryStatus)}</TableCell>
            <TableCell>{row.material ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface ContentProps {
  run: ScreeningRunDetail;
  /** The run's SecureDNA batch, when it has one and it has loaded. */
  batch: ScreeningBatch | null;
  batchLoading?: boolean;
}

/** One screening run: the sequences, Aclid's report, SecureDNA's batch, the raw JSON. */
export function ScreeningRunDetailsContent({ run, batch: batchProp, batchLoading = false }: ContentProps): React.JSX.Element {
  // Only ever show the batch that belongs to this run (a stale one from a previously opened run is ignored).
  const batch = batchProp && run.secureDna?.batchId && batchProp.id === run.secureDna.batchId ? batchProp : null;
  const [openRow, setOpenRow] = useState<string | null>(null);
  const aclid = run.aclid;
  const raw = (aclid?.raw && typeof aclid.raw === 'object' ? aclid.raw : {}) as Record<string, unknown>;
  const hits = secureDnaHitCounts(batch);
  const hasDetails = !!aclid?.details && typeof aclid.details === 'object';
  const findings = aclidFindingRows(aclid?.findings);
  const materials = materialRows(aclid?.materialSummary);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle1">{screeningRunOptionLabel(run)}</Typography>
        <Typography variant="body2" color="text.secondary">{screeningRunSecondary(run)}</Typography>
        {run.detail && <Typography variant="body2" sx={{ mt: 0.5 }}>{run.detail}</Typography>}
      </Box>

      <Box>
        <Typography variant="h6">Sequences</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Sequence</TableCell>
                <TableCell align="right">Length</TableCell>
                <TableCell>Aclid</TableCell>
                <TableCell align="right">SecureDNA hits</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {run.sequences.map((sequence) => {
                const group = hasDetails ? sequenceMatchGroup(aclid!.details, sequence.name) : null;
                const open = openRow === sequence.name;
                return (
                  <Fragment key={sequence.name}>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <IconButton size="small" aria-label={`Details for ${sequence.label}`} onClick={() => setOpenRow(open ? null : sequence.name)}>
                          <ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'none' }} />
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ wordBreak: 'break-word' }}>{sequence.label}</TableCell>
                      <TableCell align="right">{sequence.length} bp</TableCell>
                      <TableCell>{!sequence.aclidEligible ? 'Too short for Aclid' : group ? regulatoryLabel(group.regulatoryStatus) : '—'}</TableCell>
                      <TableCell align="right">{hits.has(sequence.name) ? hits.get(sequence.name) : '—'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
                        <Collapse in={open}>
                          <Box sx={{ py: 1.5 }}>
                            {!group ? (
                              <Typography variant="body2" color="text.secondary">{DETAILS_NOT_AVAILABLE_TEXT}</Typography>
                            ) : (
                              <Stack spacing={1}>
                                <Typography variant="body2">Regulatory status: {regulatoryLabel(group.regulatoryStatus)}</Typography>
                                <FindingsTable rows={group.findings} />
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Organism</TableCell>
                                      <TableCell>Gene</TableCell>
                                      <TableCell>Function</TableCell>
                                      <TableCell align="right">Identity</TableCell>
                                      <TableCell align="right">Query coverage</TableCell>
                                      <TableCell align="right">E-value</TableCell>
                                      <TableCell>Flags</TableCell>
                                      <TableCell>FunSoCs</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {group.matches.map((match, i) => (
                                      <TableRow key={i}>
                                        <TableCell>{match.organism ?? '—'}</TableCell>
                                        <TableCell>{match.gene ?? '—'}</TableCell>
                                        <TableCell>{match.function ?? '—'}</TableCell>
                                        <TableCell align="right">{pct(match.pident)}</TableCell>
                                        <TableCell align="right">{pct(match.qcov)}</TableCell>
                                        <TableCell align="right">{match.evalue === null ? '—' : match.evalue.toExponential(1)}</TableCell>
                                        <TableCell>
                                          {match.pathogenesis && <Chip size="small" color="error" label="Pathogenesis" sx={{ mr: 0.5 }} />}
                                          {match.housekeeping && <Chip size="small" label="Housekeeping" />}
                                        </TableCell>
                                        <TableCell>{match.funsocs.join(', ') || '—'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Stack>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box>
        <Typography variant="h6">Aclid</Typography>
        {!aclid ? (
          <Typography variant="body2" color="text.secondary">Aclid did not screen this run.</Typography>
        ) : (
          <Stack spacing={1.5}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
              {[
                ['Status', aclid.status ?? '—'],
                ['Verdict', biosecurityStatusLabel(aclid.homologyStatus)],
                ['Regulatory status', regulatoryLabel(aclid.regulatoryStatus)],
                ['Verification', aclid.verificationStatus ?? '—'],
                ['Decision', aclid.decisionStatus ?? '—'],
                ['Total length', typeof raw.length === 'number' ? `${raw.length} bp` : '—'],
                ['Matches', aclid.matchCount ?? '—'],
                ['Materials', aclid.materialCount ?? '—']
              ].map(([label, value]) => (
                <Box key={String(label)}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2">{value}</Typography>
                </Box>
              ))}
            </Box>
            {aclid.detail && <Typography variant="body2" color="text.secondary">{aclid.detail}</Typography>}
            <Typography variant="subtitle2">Findings</Typography>
            <FindingsTable rows={findings} />
            <Typography variant="subtitle2">Materials</Typography>
            {materials.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No controlled materials.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell>Control type</TableCell>
                    <TableCell align="right">Coverage</TableCell>
                    <TableCell align="right">Unique coverage</TableCell>
                    <TableCell align="right">Sequences</TableCell>
                    <TableCell>Risk factors</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materials.map((m) => (
                    <TableRow key={m.material}>
                      <TableCell>{m.material}</TableCell>
                      <TableCell>{m.controlType ?? '—'}</TableCell>
                      <TableCell align="right">{fmt(m.coverage)}</TableCell>
                      <TableCell align="right">{fmt(m.uniqueCoverage)}</TableCell>
                      <TableCell align="right">{m.totalSequences ?? '—'}</TableCell>
                      <TableCell>
                        {m.riskFactors.map((f) => (
                          <Chip key={f.key} size="small" label={f.label} color={f.on ? 'warning' : 'default'} variant={f.on ? 'filled' : 'outlined'} sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Accordion disableGutters variant="outlined">
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">Raw Aclid report (JSON)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box component="pre" sx={{ m: 0, fontSize: 12, overflow: 'auto', maxHeight: 320 }}>{JSON.stringify(aclid.raw ?? null, null, 2)}</Box>
              </AccordionDetails>
            </Accordion>
          </Stack>
        )}
      </Box>

      <Box>
        <Typography variant="h6">SecureDNA</Typography>
        {!run.secureDna ? (
          <Typography variant="body2" color="text.secondary">SecureDNA did not screen this run.</Typography>
        ) : (
          <Stack spacing={1}>
            <Typography variant="body2">
              {biosecurityStatusLabel(run.secureDna.status)}
              {run.secureDna.detail ? ` — ${run.secureDna.detail}` : ''}
            </Typography>
            {run.secureDna.batchId && (batchLoading ? <CircularProgress size={20} /> : batch ? <ScreeningBatchDetailsContent batch={batch} /> : null)}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

interface ModalProps extends Omit<ContentProps, 'run'> {
  open: boolean;
  run: ScreeningRunDetail | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}

export default function ScreeningRunDetailsModal({ open, run, loading = false, error, batch, batchLoading, onClose }: ModalProps): React.JSX.Element {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '95vw', sm: 960 }, maxWidth: 1000,
          bgcolor: 'background.paper', border: '1px solid #000', boxShadow: 24, p: 3, borderRadius: '16px', maxHeight: '90vh', overflow: 'auto'
        }}
      >
        <Typography variant="h5" sx={{ mb: 2 }}>Screening run</Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : !run ? (
          <Typography color="text.secondary">No screening run found.</Typography>
        ) : (
          <ScreeningRunDetailsContent run={run} batch={batch} batchLoading={batchLoading} />
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button variant="outlined" onClick={onClose}>Close</Button>
        </Box>
      </Box>
    </Modal>
  );
}

import { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Link, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useQuery } from '@apollo/client';
import { RESOLVE_PROTOCOL } from '../gql/queries';
import { UserContext, UserContextProps } from '../contexts/UserContext';

/** Resolve the REST protocols proxy endpoint from the configured GraphQL backend URL. */
function protocolsApiUrl(id: string): string {
  const backend = import.meta.env.VITE_BACKEND || 'http://localhost:3000/graphql';
  return backend.replace(/\/graphql\/?$/, '') + '/api/protocols/' + encodeURIComponent(id);
}

/**
 * Minimal HTML sanitizer for protocol step bodies. The content comes from the
 * trusted protocols.io API and is staff-only, but we still strip executable/
 * embedding vectors defensively before dangerouslySetInnerHTML.
 */
function sanitizeHtml(html: string): string {
  const input = String(html ?? '');
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return input.replace(/<\/?(script|style|iframe|object|embed|link|meta)[^>]*>/gi, '');
  }
  const doc = new DOMParser().parseFromString(input, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) el.removeAttribute(attr.name);
    });
  });
  // Open any links in a new tab.
  doc.querySelectorAll('a[href]').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
  return doc.body.innerHTML;
}

interface ProtocolStep {
  id: string;
  number: string;
  html: string;
}
interface ProtocolView {
  id: string;
  title: string;
  url: string;
  description: string;
  steps: ProtocolStep[];
}

/**
 * Steps that only title a group of substeps. protocols.io has no header flag:
 * a section title ("Sample Preparation") is an ordinary step numbered "3" whose
 * work lives in "3.1", "3.2", … — so a step with substeps is treated as a header
 * and gets no checkbox.
 */
export function headerStepIds(steps: Array<{ id: string; number: string }>): Set<string> {
  const numbers = steps.map((s) => s.number).filter(Boolean);
  return new Set(
    steps.filter((s) => s.number && numbers.some((n) => n.startsWith(`${s.number}.`))).map((s) => s.id)
  );
}

/**
 * Styles for protocols.io step HTML. Its tables arrive unstyled with fixed
 * `width="100"` header cells, so headers wrap and the grid has no lines.
 */
const stepBodySx = {
  '& p': { m: 0, mb: 0.5 },
  '& p:empty': { display: 'none' },
  '& img': { maxWidth: '100%' },
  '& figure': { m: 0, my: 1 },
  '& .component-table-container': { overflowX: 'auto', maxWidth: '100%' },
  '& table': { borderCollapse: 'collapse', width: 'auto', my: 0.5 },
  '& th, & td': {
    border: '1px solid',
    borderColor: 'divider',
    px: 1.25,
    py: 0.5,
    textAlign: 'left',
    verticalAlign: 'top',
    width: 'auto',
  },
  '& th': { whiteSpace: 'nowrap', bgcolor: 'grey.100', fontWeight: 600 },
  '& .component-table-legend': { fontSize: '0.8rem', color: 'text.secondary', fontStyle: 'italic', mt: 0.5 },
  '& .component-note': {
    bgcolor: 'grey.50',
    borderLeft: '3px solid',
    borderColor: 'info.light',
    px: 1.5,
    py: 1,
    borderRadius: 0.5,
  },
  fontSize: '0.9rem',
  wordBreak: 'break-word',
} as const;

interface ProtocolViewerProps {
  protocolId: string;
  completedStepIds: string[];
  onToggleStep: (stepId: string, done: boolean) => void;
}

/**
 * Renders a protocols.io protocol inline (title + steps) via the staff-only
 * backend proxy, with a per-step completion checklist. Always offers a deep
 * link to protocols.io as a fallback.
 */
export default function ProtocolViewer({ protocolId, completedStepIds, onToggleStep }: ProtocolViewerProps) {
  const userContext = useContext(UserContext) as UserContextProps;
  const [protocol, setProtocol] = useState<ProtocolView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!protocolId) return;
      setLoading(true);
      setError(null);
      try {
        const token = await userContext.userProps?.getAccessToken?.();
        const resp = await fetch(protocolsApiUrl(protocolId), {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        if (!resp.ok) throw new Error(`Could not load protocol (${resp.status}).`);
        const data = (await resp.json()) as ProtocolView;
        if (!cancelled) setProtocol(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load protocol.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocolId]);

  // Resolved step → service → equipment → station chain (read-only guidance for the bench).
  const { data: resolvedData } = useQuery(RESOLVE_PROTOCOL, {
    variables: { protocolId },
    skip: !protocolId,
    fetchPolicy: 'cache-and-network'
  });
  const stepMeta = useMemo(() => {
    const m = new Map<string, any>();
    (resolvedData?.resolveProtocol?.steps ?? []).forEach((s: any) => m.set(s.stepId, s));
    return m;
  }, [resolvedData]);

  const done = new Set(completedStepIds || []);
  const fallbackUrl = `https://www.protocols.io/view/${encodeURIComponent(protocolId)}`;
  const headers = useMemo(() => headerStepIds(protocol?.steps ?? []), [protocol]);
  const checkable = (protocol?.steps ?? []).filter((s) => !headers.has(s.id));
  const total = checkable.length;
  const doneCount = checkable.filter((s) => done.has(s.id)).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {protocol?.title || 'Protocol'}
        </Typography>
        {total > 0 && (
          <Typography variant="caption" color="text.secondary">
            {doneCount}/{total} steps done
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          variant="outlined"
          endIcon={<OpenInNewIcon />}
          component="a"
          href={protocol?.url || fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ textTransform: 'none' }}
        >
          Open in protocols.io
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {error}{' '}
          <Link href={fallbackUrl} target="_blank" rel="noopener noreferrer">
            Open on protocols.io
          </Link>
        </Alert>
      )}

      {protocol && !loading && !error && protocol.steps.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No steps available to show inline — open the protocol on protocols.io.
        </Typography>
      )}

      {protocol && protocol.steps.length > 0 && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {protocol.steps.map((step) => {
            if (headers.has(step.id)) {
              return (
                <Box
                  key={step.id}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    bgcolor: 'grey.100',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-of-type': { borderBottom: 'none' }
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Step {step.number}
                  </Typography>
                  <Box
                    sx={{ ...stepBodySx, fontWeight: 600, '& p': { m: 0, textAlign: 'left !important' } }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.html) }}
                  />
                </Box>
              );
            }
            const checked = done.has(step.id);
            return (
              <Box
                key={step.id}
                sx={{
                  display: 'flex',
                  gap: 1,
                  px: 1,
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  alignItems: 'flex-start',
                  bgcolor: checked ? 'success.light' : 'transparent',
                  '&:last-of-type': { borderBottom: 'none' }
                }}
              >
                <Checkbox
                  size="small"
                  checked={checked}
                  onChange={(e) => onToggleStep(step.id, e.target.checked)}
                  sx={{ mt: -0.5 }}
                />
                <Box sx={{ flex: 1, minWidth: 0, opacity: checked ? 0.7 : 1 }}>
                  {step.number && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Step {step.number}
                    </Typography>
                  )}
                  <Box sx={stepBodySx} dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.html) }} />
                  {(() => {
                    const meta = stepMeta.get(step.id);
                    if (!meta) return null;
                    const equip: any[] = meta.equipment ?? [];
                    const hasEquip = equip.length > 0;
                    if (!hasEquip && !meta.requiresNoEquipment && !(meta.issues?.length)) return null;
                    return (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                        {meta.requiresNoEquipment && !hasEquip && (
                          <Chip size="small" variant="outlined" label="No equipment required" />
                        )}
                        {equip.map((eq) => {
                          // Equipment can sit at several stations; list each with its count.
                          const placements: any[] = Array.isArray(eq.placements) ? eq.placements : [];
                          const where = placements
                            .filter((p) => p?.station)
                            .map((p) => `${p.station.name} ×${p.quantity ?? 1}`)
                            .join(', ');
                          return (
                            <Chip
                              key={eq.id}
                              size="small"
                              variant="outlined"
                              color={eq.missing || !where ? 'warning' : 'default'}
                              icon={<BuildOutlinedIcon />}
                              label={
                                eq.missing
                                  ? 'equipment removed'
                                  : where
                                  ? `${eq.name} · ${where}`
                                  : `${eq.name} · no station`
                              }
                            />
                          );
                        })}
                        {(meta.issues ?? []).map((iss: string, i: number) => (
                          <Chip key={`iss-${i}`} size="small" color="warning" variant="outlined" icon={<WarningAmberIcon />} label={iss} />
                        ))}
                      </Stack>
                    );
                  })()}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

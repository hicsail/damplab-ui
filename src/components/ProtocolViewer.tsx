import { useContext, useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, CircularProgress, Link, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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

  const done = new Set(completedStepIds || []);
  const fallbackUrl = `https://www.protocols.io/view/${encodeURIComponent(protocolId)}`;
  const total = protocol?.steps.length ?? 0;
  const doneCount = protocol?.steps.filter((s) => done.has(s.id)).length ?? 0;

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
                  <Box
                    sx={{ '& p': { m: 0, mb: 0.5 }, '& img': { maxWidth: '100%' }, fontSize: '0.9rem', wordBreak: 'break-word' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.html) }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

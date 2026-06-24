import { useContext, useMemo, useState } from 'react';
import { DeepChat } from 'deep-chat-react';
import { Box, Fab, IconButton, Paper, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import { CanvasContext } from '../contexts/Canvas';
import { AppContext } from '../contexts/App';
import { UserContext, UserContextProps } from '../contexts/UserContext';
import { hydrateAgentWorkflow, AgentWorkflowSpec } from '../controllers/AgentWorkflowHydration';

/** Resolve the REST agent endpoint from the configured GraphQL backend URL. */
function agentUrl(): string {
  const backend = import.meta.env.VITE_BACKEND || 'http://localhost:3000/graphql';
  return backend.replace(/\/graphql\/?$/, '') + '/api/agent/chat';
}

export default function CanvasAgentChat() {
  const [open, setOpen] = useState(false);
  const { setNodes, setEdges } = useContext(CanvasContext);
  const { services } = useContext(AppContext);
  const userContext: UserContextProps = useContext(UserContext);
  const [lastNote, setLastNote] = useState<string | null>(null);

  // Replace the canvas with the agent's proposed workflow, hydrated against the
  // live catalog. Replacing (not appending) matches "describe it → see it".
  const applyWorkflow = (spec: AgentWorkflowSpec) => {
    try {
      const { nodes, edges, missingServiceIds } = hydrateAgentWorkflow(spec, services || []);
      if (nodes.length === 0) {
        setLastNote('The assistant proposed a workflow but none of its services matched the catalog.');
        return;
      }
      setNodes(nodes as any);
      setEdges(edges as any);
      setLastNote(
        missingServiceIds.length > 0
          ? `Rendered ${nodes.length} step(s). Skipped ${missingServiceIds.length} unknown service(s).`
          : `Rendered ${nodes.length} step(s) on the canvas.`
      );
    } catch (e: any) {
      setLastNote(`Could not render the workflow: ${e?.message ?? 'error'}`);
    }
  };

  // DeepChat custom request handler: streams SSE from the backend, appends text
  // chunks to the chat bubble, and hydrates the canvas when a workflow arrives.
  const connect = useMemo(
    () => ({
      stream: true,
      handler: async (body: any, signals: any) => {
        try {
          const token = await userContext.userProps?.getAccessToken();
          const msgs: any[] = Array.isArray(body?.messages) ? body.messages : [];
          const last = msgs[msgs.length - 1];
          const message = last?.text ?? '';
          const history = msgs
            .slice(0, -1)
            .filter((m) => m && typeof m.text === 'string')
            .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

          const resp = await fetch(agentUrl(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ message, history })
          });

          if (!resp.ok || !resp.body) {
            signals.onResponse({ error: `Assistant request failed (${resp.status}).` });
            return;
          }
          signals.onOpen();

          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let streamedAny = false;

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split('\n\n');
            buffer = frames.pop() || '';
            for (const frame of frames) {
              const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
              if (!dataLine) continue;
              const payload = dataLine.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;
              let evt: any;
              try {
                evt = JSON.parse(payload);
              } catch {
                continue;
              }
              if (evt.delta) {
                signals.onResponse({ text: evt.delta });
                streamedAny = true;
              } else if (evt.done) {
                if (!streamedAny && evt.message) signals.onResponse({ text: evt.message });
                if (evt.type === 'workflow' && evt.workflow) applyWorkflow(evt.workflow);
              }
            }
          }
          signals.onClose();
        } catch (e: any) {
          signals.onResponse({ error: e?.message || 'Assistant error.' });
        }
      }
    }),
    // services/setNodes are read inside applyWorkflow via closure; rebuild when they change
    [services, userContext.userProps]
  );

  if (!open) {
    return (
      <Fab
        color="primary"
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300, textTransform: 'none' }}
        variant="extended"
      >
        <AutoAwesomeIcon sx={{ mr: 1 }} />
        Build with AI
      </Fab>
    );
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 400,
        height: 560,
        maxHeight: '80vh',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1, bgcolor: 'primary.main', color: 'primary.contrastText' }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoAwesomeIcon fontSize="small" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Canvas Assistant
          </Typography>
        </Stack>
        <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'inherit' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DeepChat
          connect={connect as any}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 0 }}
          introMessage={{
            text:
              "Hi! Describe the lab workflow you want — an end goal, sample type, or the operations you have in mind — and I'll assemble it on the canvas. I'll ask questions if I need more detail."
          }}
          textInput={{ placeholder: { text: 'e.g. 16S sequencing of 8 bacterial samples' } }}
          messageStyles={{
            default: {
              ai: { bubble: { backgroundColor: '#f1f5f9', color: '#111827' } },
              user: { bubble: { backgroundColor: '#1976d2', color: 'white' } }
            }
          }}
        />
      </Box>

      {lastNote && (
        <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
          <Typography variant="caption" color="text.secondary">
            {lastNote}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

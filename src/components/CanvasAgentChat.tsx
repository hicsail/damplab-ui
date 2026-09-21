import { memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DeepChat } from 'deep-chat-react';
import { Box, Fab, IconButton, Paper, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import { CanvasContext } from '../contexts/Canvas';
import { AppContext } from '../contexts/App';
import { UserContext, UserContextProps } from '../contexts/UserContext';
import { hydrateAgentWorkflow, AgentWorkflowSpec } from '../controllers/AgentWorkflowHydration';
import { buildDemoWorkflowSpec, DemoAgentScript, findDemoScript, GIBSON_DEMO } from '../data/demoAgentScripts';

/** Resolve the REST agent endpoint from the configured GraphQL backend URL. */
function agentUrl(): string {
  const backend = import.meta.env.VITE_BACKEND || 'http://localhost:3000/graphql';
  return backend.replace(/\/graphql\/?$/, '') + '/api/agent/chat';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// DeepChat props live at module scope so ChatWindow's props never change.
const REQUEST_BODY_LIMITS = { maxMessages: -1 };
const CHAT_STYLE = { width: '100%', height: '480px', border: 'none', borderRadius: '0px', backgroundColor: 'white' };
const TEXT_INPUT = { placeholder: { text: 'e.g. Gibson Assembly then sequencing' } };
const MESSAGE_STYLES = {
  default: {
    ai: { bubble: { backgroundColor: '#f1f5f9', color: '#111827', maxWidth: '85%' } },
    user: { bubble: { backgroundColor: '#1976d2', color: 'white', maxWidth: '85%' } }
  }
};
const INTRO_MESSAGES = [
  {
    text:
      "Hi! Describe the lab workflow you want — an end goal, sample type, or the operations you have in mind — and I'll assemble it on the canvas. I'll ask questions if I need more detail."
  },
  {
    // deep-chat submits a suggestion button's text as the user's message.
    html: `<div class="deep-chat-temporary-message"><div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">Try an example:</div><button class="deep-chat-button deep-chat-suggestion-button" style="text-align: left; line-height: 1.35; white-space: normal;">${escapeHtml(GIBSON_DEMO.prompt)}</button></div>`
  }
];

/**
 * The @lit/react wrapper re-assigns every property to <deep-chat> on each React
 * render, whether or not it changed, and deep-chat re-initializes and drops the
 * conversation when that happens. Canvas updates re-render CanvasAgentChat
 * through context, so the chat sits behind memo with only stable props.
 */
const ChatWindow = memo(function ChatWindow({ connect }: { connect: any }) {
  return (
    <DeepChat
      connect={connect}
      // Include the FULL conversation in body.messages (default only sends the
      // latest), so the handler can forward prior turns to the agent as history.
      requestBodyLimits={REQUEST_BODY_LIMITS}
      style={CHAT_STYLE}
      introMessage={INTRO_MESSAGES}
      textInput={TEXT_INPUT}
      messageStyles={MESSAGE_STYLES}
    />
  );
});

interface CanvasAgentChatProps {
  /** Called after a workflow lands on the canvas, e.g. to fit the view to it. */
  onWorkflowApplied?: () => void;
}

export default function CanvasAgentChat({ onWorkflowApplied }: CanvasAgentChatProps = {}) {
  const [open, setOpen] = useState(false);
  const { setNodes, setEdges } = useContext(CanvasContext);
  const { services, bundles } = useContext(AppContext);
  const userContext: UserContextProps = useContext(UserContext);
  const [lastNote, setLastNote] = useState<string | null>(null);

  // The DeepChat web component keeps its own conversation state. If we hand it
  // a new `connect` object on re-render (which happens when setNodes/setEdges
  // bump the root context), it resets and the messages vanish. So we build the
  // handler ONCE (stable identity) and have it read live values from refs.
  const servicesRef = useRef(services);
  const bundlesRef = useRef(bundles);
  const onAppliedRef = useRef(onWorkflowApplied);
  const setNodesRef = useRef(setNodes);
  const setEdgesRef = useRef(setEdges);
  const getTokenRef = useRef(userContext.userProps?.getAccessToken);
  useEffect(() => {
    servicesRef.current = services;
    bundlesRef.current = bundles;
    onAppliedRef.current = onWorkflowApplied;
    setNodesRef.current = setNodes;
    setEdgesRef.current = setEdges;
    getTokenRef.current = userContext.userProps?.getAccessToken;
  }, [services, bundles, onWorkflowApplied, setNodes, setEdges, userContext.userProps]);

  // Replace the canvas with the agent's proposed workflow, hydrated against the
  // live catalog. Replacing (not appending) matches "describe it → see it".
  const applyWorkflow = (spec: AgentWorkflowSpec) => {
    try {
      const { nodes, edges, missingServiceIds } = hydrateAgentWorkflow(spec, servicesRef.current || []);
      if (nodes.length === 0) {
        setLastNote('The assistant proposed a workflow but none of its services matched the catalog.');
        return;
      }
      setNodesRef.current?.(nodes as any);
      setEdgesRef.current?.(edges as any);
      onAppliedRef.current?.();
      setLastNote(
        missingServiceIds.length > 0
          ? `Rendered ${nodes.length} step(s). Skipped ${missingServiceIds.length} unknown service(s).`
          : `Rendered ${nodes.length} step(s) on the canvas.`
      );
    } catch (e: any) {
      setLastNote(`Could not render the workflow: ${e?.message ?? 'error'}`);
    }
  };

  // Scripted demo reply: a pause while the loading bubble shows, the reply
  // streamed word by word, then the workflow applied — no backend call.
  const playDemoScript = async (script: DemoAgentScript, signals: any) => {
    await sleep(2200);
    signals.onOpen();
    const tokens = script.reply.match(/\S+\s*|\s+/g) ?? [script.reply];
    for (const token of tokens) {
      signals.onResponse({ text: token });
      await sleep(35);
    }
    await sleep(400);
    applyWorkflow(buildDemoWorkflowSpec(script, servicesRef.current || [], bundlesRef.current || []));
    signals.onClose();
  };

  // DeepChat custom request handler: streams SSE from the backend, appends text
  // chunks to the chat bubble, and hydrates the canvas when a workflow arrives.
  // Built once (empty deps) so DeepChat never sees a changed prop.
  const connect = useMemo(
    () => ({
      stream: true,
      handler: async (body: any, signals: any) => {
        try {
          const token = await getTokenRef.current?.();
          const msgs: any[] = Array.isArray(body?.messages) ? body.messages : [];
          const last = msgs[msgs.length - 1];
          const message = last?.text ?? '';

          const demo = findDemoScript(message);
          if (demo) {
            await playDemoScript(demo, signals);
            return;
          }
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
    // Stable identity — live values are read from refs inside the handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
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
        sx={{ px: 2, py: 1, bgcolor: 'primary.main', color: 'primary.contrastText', flexShrink: 0 }}
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

      {/* DeepChat needs an explicit pixel height — it does NOT size to a flex
          parent. Without this its message list grows unbounded and the input
          box gets pushed out of the clipped panel. */}
      <ChatWindow connect={connect} />

      {lastNote && (
        <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc', flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary">
            {lastNote}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

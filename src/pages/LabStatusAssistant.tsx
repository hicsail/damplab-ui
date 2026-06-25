import { useContext, useEffect, useMemo, useRef } from 'react';
import { DeepChat } from 'deep-chat-react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import { UserContext, UserContextProps } from '../contexts/UserContext';

/** Resolve the REST lab-status endpoint from the configured GraphQL backend URL. */
function labStatusUrl(): string {
  const backend = import.meta.env.VITE_BACKEND || 'http://localhost:3000/graphql';
  return backend.replace(/\/graphql\/?$/, '') + '/api/agent/lab-status/chat';
}

interface ExtractedRequest {
  messages: Array<{ role?: string; text?: string }>;
  fileText: string | null;
  fileName: string | null;
}

/**
 * Normalize DeepChat's request body for our handler. DeepChat sends a plain
 * `{ messages }` object for text-only turns, but a `FormData` (with a `files`
 * array + `message1`, `message2`, … entries) when a file is attached. We read
 * the attached file's text so the backend/n8n can parse the CSV. Also tolerates
 * the inline-file shape (a message carrying `files:[{src,name}]`) just in case.
 */
async function extractRequest(body: any): Promise<ExtractedRequest> {
  const messages: ExtractedRequest['messages'] = [];
  let fileText: string | null = null;
  let fileName: string | null = null;

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    // Message content is stored under message0/message1/... (tolerate 0- or 1-based).
    for (let i = 0; i < 1000; i++) {
      const raw = body.get(`message${i}`);
      if (raw == null) {
        if (i === 0) continue; // 1-based: skip the missing message0 and keep looking
        break; // contiguous run ended
      }
      try {
        messages.push(typeof raw === 'string' ? JSON.parse(raw) : (raw as any));
      } catch {
        messages.push({ role: 'user', text: String(raw) });
      }
    }
    const files = body.getAll('files');
    const file = files && files.length ? (files[files.length - 1] as File) : null;
    if (file && typeof (file as any).text === 'function') {
      fileText = await file.text();
      fileName = file.name || 'upload.csv';
    }
  } else {
    const msgs: any[] = Array.isArray(body?.messages) ? body.messages : [];
    messages.push(...msgs);
    // Inline-file fallback: a message may carry files:[{ src, name }] (src = data URL).
    for (let i = msgs.length - 1; i >= 0 && !fileText; i--) {
      const f = Array.isArray(msgs[i]?.files) ? msgs[i].files[msgs[i].files.length - 1] : null;
      if (f?.src) {
        try {
          fileText = await (await fetch(f.src)).text();
        } catch {
          fileText = String(f.src);
        }
        fileName = f.name || 'upload.csv';
      }
    }
  }
  return { messages, fileText, fileName };
}

/**
 * Full-screen, staff-only lab-ops assistant. Embedded (not floating) DeepChat
 * that streams answers from the backend lab-status agent, which queries Mongo
 * via n8n and can propose catalog-service creation from an attached CSV.
 *
 * CSV attachment uses DeepChat's native input-bar attach button (mixedFiles).
 * We read the file's text in the handler and keep it in a ref so it persists
 * across turns — the "confirm" turn re-sends the same CSV the proposal was
 * built from (n8n re-parses it deterministically before inserting).
 */
export default function LabStatusAssistant() {
  const userContext: UserContextProps = useContext(UserContext);
  const getTokenRef = useRef(userContext.userProps?.getAccessToken);
  useEffect(() => {
    getTokenRef.current = userContext.userProps?.getAccessToken;
  }, [userContext.userProps]);

  // Last-seen CSV, kept so a follow-up "confirm" (sent with no new attachment)
  // still carries the file the proposal was based on.
  const csvRef = useRef<{ filename: string; content: string } | null>(null);

  // Stable handler (built once) so DeepChat never resets mid-conversation.
  const connect = useMemo(
    () => ({
      stream: true,
      handler: async (body: any, signals: any) => {
        try {
          const token = await getTokenRef.current?.();
          const { messages, fileText, fileName } = await extractRequest(body);

          // A freshly-attached file updates the persisted CSV.
          if (fileText && fileText.trim()) {
            csvRef.current = { filename: fileName || 'upload.csv', content: fileText };
          }

          const last = messages[messages.length - 1];
          const message = last?.text ?? '';
          const history = messages
            .slice(0, -1)
            .filter((m) => m && typeof m.text === 'string')
            .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text as string }));

          const resp = await fetch(labStatusUrl(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ message, history, csv: csvRef.current || undefined })
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
              } else if (evt.done && !streamedAny && evt.message) {
                signals.onResponse({ text: evt.message });
              }
            }
          }
          signals.onClose();
        } catch (e: any) {
          signals.onResponse({ error: e?.message || 'Assistant error.' });
        }
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <Box sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <InsightsIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Lab Ops Assistant
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ask about lab status, or attach a CSV (📎 in the message bar) to create catalog services. Changes are previewed and require your explicit confirmation before anything is written.
          </Typography>
        </Box>
      </Stack>

      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2, maxWidth: 1000 }}>
        <DeepChat
          connect={connect as any}
          requestBodyLimits={{ maxMessages: -1 }}
          mixedFiles={{ files: { acceptedFormats: '.csv,.txt', maxNumberOfFiles: 1 } }}
          style={{ width: '100%', height: 'calc(100vh - 230px)', minHeight: '420px', border: 'none', borderRadius: '0px', backgroundColor: 'white' }}
          introMessage={{
            text:
              "Hi! I can report on the current state of the lab — try “How many operations are running right now?” or “Break down jobs by status”. You can also attach a CSV (📎) to create catalog services; I'll show you exactly what will be created and wait for your confirmation."
          }}
          textInput={{ placeholder: { text: 'Ask about lab status, or attach a CSV…' } }}
          messageStyles={{
            default: {
              ai: { bubble: { backgroundColor: '#f1f5f9', color: '#111827', maxWidth: '85%' } },
              user: { bubble: { backgroundColor: '#1976d2', color: 'white', maxWidth: '85%' } }
            }
          }}
        />
      </Paper>
    </Box>
  );
}

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DeepChat } from 'deep-chat-react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { UserContext, UserContextProps } from '../contexts/UserContext';

/** Resolve the REST lab-status endpoint from the configured GraphQL backend URL. */
function labStatusUrl(): string {
  const backend = import.meta.env.VITE_BACKEND || 'http://localhost:3000/graphql';
  return backend.replace(/\/graphql\/?$/, '') + '/api/agent/lab-status/chat';
}

/**
 * Full-screen, staff-only lab-status assistant. Embedded (not floating) DeepChat
 * that streams answers from the backend lab-status agent, which queries Mongo
 * via n8n. Pure Q&A — no canvas hydration.
 */
export default function LabStatusAssistant() {
  const userContext: UserContextProps = useContext(UserContext);
  const getTokenRef = useRef(userContext.userProps?.getAccessToken);
  useEffect(() => {
    getTokenRef.current = userContext.userProps?.getAccessToken;
  }, [userContext.userProps]);

  // Attached CSV is kept in a ref (read by the stable handler) AND mirrored to
  // state for the chip. It persists across turns so the confirm turn re-sends
  // the same CSV the proposal was built from; cleared explicitly.
  const csvRef = useRef<{ filename: string; content: string } | null>(null);
  const [csvName, setCsvName] = useState<string | null>(null);

  const handleCsvSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      csvRef.current = { filename: file.name, content: String(reader.result ?? '') };
      setCsvName(file.name);
    };
    reader.readAsText(file);
  };

  const clearCsv = () => {
    csvRef.current = null;
    setCsvName(null);
  };

  // Stable handler (built once) so DeepChat never resets mid-conversation.
  const connect = useMemo(
    () => ({
      stream: true,
      handler: async (body: any, signals: any) => {
        try {
          const token = await getTokenRef.current?.();
          const msgs: any[] = Array.isArray(body?.messages) ? body.messages : [];
          const last = msgs[msgs.length - 1];
          const message = last?.text ?? '';
          const history = msgs
            .slice(0, -1)
            .filter((m) => m && typeof m.text === 'string')
            .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

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
            Ask about lab status, or attach a CSV to create catalog services. Data changes are previewed and require your explicit confirmation before anything is written.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button component="label" variant="outlined" size="small" startIcon={<UploadFileIcon />} sx={{ textTransform: 'none' }}>
            Attach CSV
            <input type="file" accept=".csv,text/csv" hidden onChange={handleCsvSelected} />
          </Button>
          {csvName && <Chip label={csvName} size="small" onDelete={clearCsv} color="primary" variant="outlined" />}
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2, maxWidth: 1000 }}>
        <DeepChat
          connect={connect as any}
          requestBodyLimits={{ maxMessages: -1 }}
          style={{ width: '100%', height: 'calc(100vh - 230px)', minHeight: '420px', border: 'none', borderRadius: '0px', backgroundColor: 'white' }}
          introMessage={{
            text:
              "Hi! I can report on the current state of the lab. Try: “How many operations are running right now?”, “Break down jobs by status”, or “How much inventory is in use?”"
          }}
          textInput={{ placeholder: { text: 'Ask about lab status…' } }}
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

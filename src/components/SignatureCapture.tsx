// SignatureCapture.tsx - Draw or type signature for SOW
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { SOWSignature } from '../types/SOWTypes';

const theme = createTheme({ palette: { mode: 'light' } });

interface SignatureCaptureProps {
  open: boolean;
  onClose: () => void;
  onSign: (signature: SOWSignature) => void;
  title?: string;
  signerLabel?: string;
  defaultName?: string;
  defaultTitle?: string;
  /** When updating, show this saved signature in the UI and pre-fill fields */
  existingSignature?: SOWSignature | null;
}

const CANVAS_W = 400;
const CANVAS_H = 160;

export const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  open,
  onClose,
  onSign,
  title = 'Sign Statement of Work',
  signerLabel = 'Signer',
  defaultName = '',
  defaultTitle = '',
  existingSignature = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<'draw' | 'type'>('draw');
  const [name, setName] = useState(defaultName);
  const [titleVal, setTitleVal] = useState(defaultTitle);
  const [typedSignature, setTypedSignature] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (open && existingSignature) {
      setName(existingSignature.name || defaultName);
      setTitleVal(existingSignature.title ?? defaultTitle);
      setTypedSignature('');
      setHasDrawn(false);
    } else if (open) {
      setName(defaultName);
      setTitleVal(defaultTitle);
      setTypedSignature('');
      setHasDrawn(false);
    }
  }, [open, existingSignature, defaultName, defaultTitle]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    setHasDrawn(false);
  }, []);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setDrawing(false);

  const CANVAS_W = 400;
  const CANVAS_H = 160;

  const initCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    if (!el) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = CANVAS_W * dpr;
    el.height = CANVAS_H * dpr;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
  }, []);

  const getSignatureDataUrl = (): string | undefined => {
    if (tab === 'draw' && canvasRef.current && hasDrawn) {
      return canvasRef.current.toDataURL('image/png');
    }
    if (tab === 'type' && typedSignature.trim()) {
      const canvas = document.createElement('canvas');
      const w = 320;
      const h = 80;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#000';
      ctx.font = '28px cursive';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSignature.trim(), 10, h / 2);
      return canvas.toDataURL('image/png');
    }
    return undefined;
  };

  const handleSubmit = () => {
    const fullName = name.trim();
    if (!fullName) return;
    let signatureDataUrl = getSignatureDataUrl();
    if (!signatureDataUrl && existingSignature?.signatureDataUrl) {
      signatureDataUrl = existingSignature.signatureDataUrl;
    }
    if (!signatureDataUrl) {
      if (tab === 'draw' && !hasDrawn) return;
      if (tab === 'type' && !typedSignature.trim()) return;
    }

    onSign({
      name: fullName,
      title: titleVal.trim() || undefined,
      signedAt: new Date().toISOString(),
      signatureDataUrl: signatureDataUrl || undefined,
    });
    onClose();
    setName(defaultName);
    setTitleVal(defaultTitle);
    setTypedSignature('');
    setHasDrawn(false);
    clearCanvas();
  };

  const hasNewSignature = (tab === 'draw' && hasDrawn) || (tab === 'type' && typedSignature.trim());
  const canSubmit = name.trim() && (hasNewSignature || !!existingSignature?.signatureDataUrl);

  return (
    <ThemeProvider theme={theme}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Signing as: {signerLabel}
          </Typography>
          {open && existingSignature && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Current saved signature
              </Typography>
              {existingSignature.signatureDataUrl && typeof existingSignature.signatureDataUrl === 'string' && existingSignature.signatureDataUrl.startsWith('data:') ? (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: 'white', display: 'inline-block' }}>
                  <img
                    src={existingSignature.signatureDataUrl}
                    alt="Saved signature"
                    style={{ maxWidth: 320, maxHeight: 80, display: 'block' }}
                  />
                </Box>
              ) : (
                <Typography variant="body2">{existingSignature.name}</Typography>
              )}
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }} color="text.secondary">
                Signed: {String(existingSignature.signedAt ?? '').slice(0, 10)}
                {existingSignature.title ? ` · ${existingSignature.title}` : ''}
              </Typography>
            </Paper>
          )}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Draw signature" value="draw" />
            <Tab label="Type signature" value="type" />
          </Tabs>

          {tab === 'draw' && (
            <Box>
              <Box
                sx={{
                  border: '1px solid #ccc',
                  borderRadius: 1,
                  bgcolor: '#fff',
                  width: CANVAS_W,
                  height: CANVAS_H,
                  touchAction: 'none',
                }}
              >
                <canvas
                  ref={initCanvas}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  style={{ display: 'block', cursor: 'crosshair' }}
                />
              </Box>
              <Button size="small" onClick={clearCanvas} sx={{ mt: 1 }}>
                Clear
              </Button>
            </Box>
          )}

          {tab === 'type' && (
            <TextField
              fullWidth
              label="Type your full name as signature"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="e.g. Jane Smith"
              sx={{ mb: 1 }}
            />
          )}

          <TextField
            fullWidth
            required
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Title (optional)"
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            placeholder="e.g. Principal Investigator"
            sx={{ mt: 1.5 }}
          />
          <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
            Date will be recorded automatically when you sign.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
            Sign
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};

export default SignatureCapture;

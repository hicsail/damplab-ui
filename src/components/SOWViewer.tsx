import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DrawIcon from '@mui/icons-material/Draw';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { GET_SOW_BY_JOB_ID } from '../gql/queries';
import { SUBMIT_SOW_SIGNATURE } from '../gql/mutations';
import SOWDocument from './SOWDocument';
import SignatureCapture from './SignatureCapture';
import { SOWData, SOWSignature } from '../types/SOWTypes';

const SOW_SIGNATURES_STORAGE_KEY = 'damplab-sow-signatures';

interface SOWViewerProps {
  jobId: string;
  sowData?: {
    id: string;
    sowNumber: string;
    date: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  /** When provided, enables Sign SOW (client) or Sign as BU (technician) and identifies signer */
  currentUser?: { email?: string; name?: string; isStaff?: boolean };
}

function loadStoredSignatures(sowId: string): { client?: SOWSignature; technician?: SOWSignature } {
  try {
    const key = `${SOW_SIGNATURES_STORAGE_KEY}-${sowId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
}

function storeSignatures(sowId: string, client?: SOWSignature | null, technician?: SOWSignature | null) {
  try {
    const key = `${SOW_SIGNATURES_STORAGE_KEY}-${sowId}`;
    localStorage.setItem(key, JSON.stringify({ client: client || undefined, technician: technician || undefined }));
  } catch (_) {}
}

function normalizeSignature(sig: unknown): SOWSignature | null {
  if (!sig || typeof sig !== 'object') return null;
  const o = sig as Record<string, unknown>;
  const name = o.name != null ? String(o.name) : '';
  const signedAt = o.signedAt != null ? String(o.signedAt) : new Date().toISOString();
  if (!name.trim()) return null;
  return {
    name: name.trim(),
    title: o.title != null ? String(o.title) : undefined,
    signedAt,
    signatureDataUrl: typeof o.signatureDataUrl === 'string' ? o.signatureDataUrl : undefined,
  };
}

export const SOWViewer: React.FC<SOWViewerProps> = ({ jobId, sowData: sowDataFromJob, currentUser }) => {
  const [fullSOWData, setFullSOWData] = useState<SOWData | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [clientSignature, setClientSignature] = useState<SOWSignature | null>(null);
  const [technicianSignature, setTechnicianSignature] = useState<SOWSignature | null>(null);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signAs, setSignAs] = useState<'client' | 'technician'>('client');
  const [signErrorMessage, setSignErrorMessage] = useState<string | null>(null);

  const sowId = fullSOWData?.id || sowDataFromJob?.id || jobId;

  const [submitSignature, { loading: signing, error: signError, reset: resetSignError }] = useMutation(SUBMIT_SOW_SIGNATURE, {
    refetchQueries: [{ query: GET_SOW_BY_JOB_ID, variables: { jobId } }],
    onCompleted: (data) => {
      resetSignError();
      setSignErrorMessage(null);
      const updated = data?.submitSOWSignature;
      if (updated?.clientSignature) setClientSignature(normalizeSignature(updated.clientSignature));
      if (updated?.technicianSignature) setTechnicianSignature(normalizeSignature(updated.technicianSignature));
      if (sowId && updated) storeSignatures(sowId, updated.clientSignature, updated.technicianSignature);
    },
    onError: (err) => {
      setSignErrorMessage(err.message);
      console.error('[SubmitSOWSignature] mutation error (full):', err);
      console.error('[SubmitSOWSignature] message:', err.message);
      if (err.graphQLErrors?.length) {
        err.graphQLErrors.forEach((e: { message: string; path?: unknown; extensions?: unknown }, i: number) => {
          console.error(`[SubmitSOWSignature] graphQLErrors[${i}]:`, e.message, e.path, e.extensions);
        });
      }
      if (err.networkError) {
        const net = err.networkError as { statusCode?: number; result?: unknown; message?: string };
        console.error('[SubmitSOWSignature] networkError:', {
          statusCode: net.statusCode,
          message: net.message,
          result: net.result,
        });
      }
    },
  });

  // Fetch full SOW data if we only have summary
  const { data, loading, error } = useQuery(GET_SOW_BY_JOB_ID, {
    variables: { jobId },
    skip: !sowDataFromJob,
    onCompleted: (data) => {
      if (data?.sowByJobId) {
        const sow = data.sowByJobId;
        setFullSOWData({
          id: sow.id,
          sowNumber: sow.sowNumber,
          date: sow.date,
          jobId: sow.jobId,
          jobName: sow.jobName,
          clientName: sow.clientName,
          clientEmail: sow.clientEmail,
          clientInstitution: sow.clientInstitution,
          clientAddress: sow.clientAddress || '',
          scopeOfWork: sow.scopeOfWork || [],
          deliverables: sow.deliverables || [],
          services: sow.services || [],
          timeline: sow.timeline,
          resources: sow.resources,
          pricing: sow.pricing,
          terms: sow.terms,
          additionalInformation: sow.additionalInformation || '',
          createdAt: sow.createdAt,
          createdBy: sow.createdBy,
          clientSignature: sow.clientSignature ?? undefined,
          technicianSignature: sow.technicianSignature ?? undefined,
        });
        const clientSig = normalizeSignature(sow.clientSignature);
        if (clientSig) setClientSignature(clientSig);
        else if (sowId) {
          const stored = loadStoredSignatures(sowId);
          if (stored.client) setClientSignature(stored.client);
        }
        const techSig = normalizeSignature(sow.technicianSignature);
        if (techSig) setTechnicianSignature(techSig);
        else if (sowId) {
          const stored = loadStoredSignatures(sowId);
          if (stored.technician) setTechnicianSignature(stored.technician);
        }
      }
    },
  });

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DRAFT':
        return 'default';
      case 'FINAL':
        return 'info';
      case 'SENT':
        return 'warning';
      case 'SIGNED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const mergedSOWData: SOWData | null = fullSOWData
    ? {
        ...fullSOWData,
        clientSignature: (clientSignature ?? (fullSOWData.clientSignature ? normalizeSignature(fullSOWData.clientSignature) : null)) ?? undefined,
        technicianSignature: (technicianSignature ?? (fullSOWData.technicianSignature ? normalizeSignature(fullSOWData.technicianSignature) : null)) ?? undefined,
      }
    : null;

  const handleSignSubmit = (signature: SOWSignature) => {
    if (!sowId) return;
    setSignModalOpen(false);
    const role = signAs === 'client' ? 'CLIENT' : 'TECHNICIAN';
    const input: Record<string, unknown> = {
      sowId,
      role,
      name: signature.name,
      signedAt: signature.signedAt,
    };
    if (signature.title) input.title = signature.title;
    if (signature.signatureDataUrl) input.signatureDataUrl = signature.signatureDataUrl;
    const variables = { input };
    console.log('[SubmitSOWSignature] sending variables:', {
      input: { ...input, signatureDataUrl: input.signatureDataUrl ? `[base64, ${String(input.signatureDataUrl).length} chars]` : undefined },
    });
    submitSignature({ variables });
    if (signAs === 'client') {
      setClientSignature(signature);
      storeSignatures(sowId, signature, technicianSignature ?? undefined);
    } else {
      setTechnicianSignature(signature);
      storeSignatures(sowId, clientSignature ?? undefined, signature);
    }
  };

  const openClientSign = () => {
    resetSignError();
    setSignErrorMessage(null);
    setSignAs('client');
    setSignModalOpen(true);
  };
  const openTechnicianSign = () => {
    resetSignError();
    setSignErrorMessage(null);
    setSignAs('technician');
    setSignModalOpen(true);
  };
  const isStaff = currentUser?.isStaff === true;

  if (!sowDataFromJob) {
    return null;
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading SOW. Please try again later.
      </Alert>
    );
  }

  return (
    <>
      <Card sx={{ mt: 2, bgcolor: 'success.light', border: '2px solid', borderColor: 'success.main', boxShadow: 2 }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CheckCircleIcon sx={{ fontSize: 32 }} color="success" />
              <Box>
                <Typography variant="h6" fontWeight="bold" color="success.dark">
                  Statement of Work generated
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You can view, download, or share the SOW for this job below.
                </Typography>
              </Box>
            </Box>
            <Chip
              label={sowDataFromJob.status}
              color={getStatusColor(sowDataFromJob.status) as any}
              size="medium"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Typography variant="body2" sx={{ mb: 1, mt: 1 }}>
            <strong>SOW Number:</strong> {sowDataFromJob.sowNumber} &nbsp;|&nbsp;
            <strong>Created:</strong> {new Date(sowDataFromJob.createdAt).toLocaleDateString()}
          </Typography>
          {(clientSignature || technicianSignature) && (
            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                Signatures:
              </Typography>
              {clientSignature && (
                <Chip
                  size="small"
                  label={`Client: ${clientSignature.name} (${String(clientSignature.signedAt ?? '').slice(0, 10)})`}
                  color="default"
                  variant="outlined"
                />
              )}
              {technicianSignature && (
                <Chip
                  size="small"
                  label={`BU: ${technicianSignature.name} (${String(technicianSignature.signedAt ?? '').slice(0, 10)})`}
                  color="default"
                  variant="outlined"
                />
              )}
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<DescriptionIcon />}
              onClick={() => setViewModalOpen(true)}
              disabled={!fullSOWData}
            >
              View SOW
            </Button>
            {mergedSOWData && (
              <PDFDownloadLink
                document={<SOWDocument sowData={mergedSOWData} />}
                fileName={`${sowDataFromJob.sowNumber}-${fullSOWData!.jobName}.pdf`}
              >
                {({ blob, url, loading: pdfLoading }) => (
                  <Button
                    variant="contained"
                    startIcon={<PictureAsPdfIcon />}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? 'Generating...' : 'Download SOW PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
            {currentUser && !isStaff && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={signing ? <CircularProgress size={16} /> : <DrawIcon />}
                onClick={openClientSign}
                disabled={signing}
              >
                {clientSignature ? 'Update my signature' : 'Sign SOW (Client)'}
              </Button>
            )}
            {currentUser && isStaff && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={signing ? <CircularProgress size={16} /> : <DrawIcon />}
                onClick={openTechnicianSign}
                disabled={signing}
              >
                {technicianSignature ? 'Update BU signature' : 'Sign as BU'}
              </Button>
            )}
          </Box>
          {(signError || signErrorMessage) && (
            <Alert severity="error" sx={{ mt: 1 }} onClose={() => { resetSignError(); setSignErrorMessage(null); }}>
              Failed to save signature. {signErrorMessage || signError?.message || 'Please try again.'}
            </Alert>
          )}
          {((clientSignature && !isStaff) || (technicianSignature && isStaff)) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Your signature will appear on the downloaded PDF.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* View SOW Modal */}
      <Dialog
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {sowDataFromJob.sowNumber}
            </Typography>
            {mergedSOWData && (
              <PDFDownloadLink
                document={<SOWDocument sowData={mergedSOWData} />}
                fileName={`${sowDataFromJob.sowNumber}-${fullSOWData!.jobName}.pdf`}
              >
                {({ blob, url, loading: pdfLoading }) => (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PictureAsPdfIcon />}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? 'Generating...' : 'Download PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {fullSOWData ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Use the download button above to view the complete SOW PDF document.
              </Alert>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom><strong>Client:</strong> {fullSOWData.clientName}</Typography>
                <Typography variant="body2"><strong>Institution:</strong> {fullSOWData.clientInstitution}</Typography>
                <Typography variant="body2"><strong>Project Manager:</strong> {fullSOWData.resources.projectManager}</Typography>
                <Typography variant="body2"><strong>Timeline:</strong> {fullSOWData.timeline.startDate} - {fullSOWData.timeline.endDate}</Typography>
                <Typography variant="body2"><strong>Total Cost:</strong> ${fullSOWData.pricing.totalCost.toLocaleString()}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom><strong>Scope of Work:</strong></Typography>
                {Array.isArray(fullSOWData.scopeOfWork) ? (
                  <ul>
                    {fullSOWData.scopeOfWork.map((item: string, index: number) => (
                      <li key={index}><Typography variant="body2">{item}</Typography></li>
                    ))}
                  </ul>
                ) : (
                  <Typography variant="body2">{fullSOWData.scopeOfWork}</Typography>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom><strong>Deliverables:</strong></Typography>
                <ul>
                  {fullSOWData.deliverables.map((deliverable: string, index: number) => (
                    <li key={index}><Typography variant="body2">{deliverable}</Typography></li>
                  ))}
                </ul>
              </Box>
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <SignatureCapture
        open={signModalOpen}
        onClose={() => setSignModalOpen(false)}
        onSign={handleSignSubmit}
        title={signAs === 'client' ? 'Sign SOW as Client' : 'Sign SOW on behalf of Boston University'}
        signerLabel={signAs === 'client' ? (fullSOWData?.clientName || 'Client') : 'DAMP Lab (Project Manager)'}
        defaultName={signAs === 'client' ? (currentUser?.name || fullSOWData?.clientName || '') : (fullSOWData?.resources?.projectManager || '')}
        defaultTitle={signAs === 'client' ? '' : 'Project Manager'}
        existingSignature={signAs === 'client' ? clientSignature : technicianSignature}
      />
    </>
  );
};

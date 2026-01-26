import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
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
import { PDFDownloadLink } from '@react-pdf/renderer';
import { GET_SOW_BY_JOB_ID } from '../gql/queries';
import SOWDocument from './SOWDocument';
import { SOWData } from '../types/SOWTypes';

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
}

export const SOWViewer: React.FC<SOWViewerProps> = ({ jobId, sowData: sowDataFromJob }) => {
  const [fullSOWData, setFullSOWData] = useState<SOWData | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Fetch full SOW data if we only have summary
  const { data, loading, error } = useQuery(GET_SOW_BY_JOB_ID, {
    variables: { jobId },
    skip: !sowDataFromJob || !!fullSOWData,
    onCompleted: (data) => {
      if (data?.sowByJobId) {
        // Convert GraphQL response to SOWData format
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
        });
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
          <Typography variant="body2" sx={{ mb: 2, mt: 1 }}>
            <strong>SOW Number:</strong> {sowDataFromJob.sowNumber} &nbsp;|&nbsp;
            <strong>Created:</strong> {new Date(sowDataFromJob.createdAt).toLocaleDateString()}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<DescriptionIcon />}
              onClick={() => setViewModalOpen(true)}
              disabled={!fullSOWData}
            >
              View SOW
            </Button>
            {fullSOWData && (
              <PDFDownloadLink
                document={<SOWDocument sowData={fullSOWData} />}
                fileName={`${sowDataFromJob.sowNumber}-${fullSOWData.jobName}.pdf`}
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
          </Box>
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
            {fullSOWData && (
              <PDFDownloadLink
                document={<SOWDocument sowData={fullSOWData} />}
                fileName={`${sowDataFromJob.sowNumber}-${fullSOWData.jobName}.pdf`}
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
    </>
  );
};

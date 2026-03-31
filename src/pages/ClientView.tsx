import React, { useState, useContext } from 'react'
import { useParams } from 'react-router';
import { useQuery } from '@apollo/client';
import { Box, Card, CardContent, Typography, Alert, Link as MuiLink, List, ListItem, ListItemText, Divider } from '@mui/material';
import { AccessTime, Publish, NotInterested, Check, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import PendingIcon from '@mui/icons-material/Pending';
import LoopIcon from '@mui/icons-material/Loop';
import DoneIcon from '@mui/icons-material/Done';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { GET_OWN_JOB_BY_ID } from '../gql/queries';
import { SOWViewer }              from '../components/SOWViewer';
import { CommentsSection }        from '../components/CommentsSection';
import { UserContext }            from '../contexts/UserContext';
import { calculateServiceCost }   from '../utils/servicePricing';


export default function Tracking() {

    const { id }                                        = useParams();
    const userContext                                   = useContext(UserContext);

    const [workflowName,        setWorkflowName]        = useState('');
    const [workflowState,       setWorkflowState]       = useState('');
    const [jobName,             setJobName]             = useState('');
    const [jobState,            setJobState]            = useState('');
    const [jobTime,             setJobTime]             = useState('');
    const [workflowUsername,    setWorkflowUsername]    = useState('');
    const [workflowInstitution, setWorkflowInstitution] = useState('');
    const [workflowEmail,       setWorkflowEmail]       = useState('');  // ▶ URLSearchParams {}
    const [workflows,           setWorklows]            = useState([]);  // ▶ URLSearchParams {}
    const [sowData, setSowData] = useState<any>(null);
    const [attachments, setAttachments] = useState<any[]>([]);

    const skipQuery = !id || !userContext?.userProps?.isAuthenticated;

    const { data, loading, error } = useQuery(GET_OWN_JOB_BY_ID, {
        variables: { id: id! },
        skip: skipQuery,
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
        onCompleted: (data) => {
            const job = data?.ownJobById;
            console.log('ownJobById onCompleted attachments:', job?.attachments);
            if (!job?.workflows?.length) return;
            setWorkflowName(       job.workflows[0].name);
            setWorkflowState(      job.workflows[0].state);
            setJobName(            job.name);
            setJobState(           job.state);
            setJobTime(            job.submitted);
            setWorkflowUsername(   job.clientDisplayName || job.username);
            setWorkflowInstitution(job.institute);
            setWorkflowEmail(      job.email);
            setWorklows(           job.workflows);
            setSowData(job.sow ?? null);
            setAttachments(job.attachments ?? []);
        },
    });

    if (skipQuery) return <p>Loading...</p>;
    if (loading) return <p>Loading...</p>;
    // When backend returns errors (e.g. not found, forbidden), treat as no access unless we have job data
    if (error && !data?.ownJobById) {
        const msg = error.graphQLErrors?.[0]?.message ?? error.message;
        return (
            <p>
                Job not found. You may not have access to this job.
                {import.meta.env.DEV && msg && (
                    <span style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#666' }}>{msg}</span>
                )}
            </p>
        );
    }
    if (data && !data.ownJobById) return <p>Job not found. You may not have access to this job.</p>;

    const jobStatus = () => {
        const submitText = "Your job has been submitted to the DAMP lab and is awaiting review. Once the review is done, you will see the updated state over here.";
        const createText = "Your job is currently being created. Once the job is created, you will see the updated state over here.";
        const acceptText = "Your job has been reviewed by the DAMP lab and has been accepted. You will receive a SOW to review and sign here once it has been generated.";
        const rejectText = "Your job has been reviewed by the DAMP lab and has been accepted. Please complete any necessary modifications and resubmit your job.";
        const defaultText = "Invalid Case";

        switch (jobState) {
            case 'SUBMITTED':
                return ['rgba(256, 256, 0, 0.5)', <Publish />, submitText]
            case 'CREATING':
                return ['rgba(256, 256, 0, 0.5)', <AccessTime />, createText]
            case 'ACCEPTED':
                return ['rgb(0, 256, 0, 0.5)', <Check />, acceptText];
            case 'REJECTED':
                return ['rgb(256, 0, 0, 0.5)', <NotInterested />, rejectText];
            default:
                return ['rgb(0, 0, 0, 0)', <NotInterested />, defaultText];
        }
    }

    const jobStatusColor = jobStatus()[0];
    const jobStatusIcon  = jobStatus()[1];
    const jobStatusText  = jobStatus()[2];

    const formatParameterValue = (parameterDef: any, value: unknown): string => {
        const base = (() => {
            if (Array.isArray(value)) return value.map((v) => String(v ?? '')).filter(Boolean).join(', ');
            if (value === null || value === undefined || value === '') return '';
            if (typeof value === 'object') {
                const v = value as any;
                if (typeof v.filename === 'string' && v.filename.trim() !== '') return v.filename;
                if (typeof v.name === 'string' && v.name.trim() !== '') return v.name;
                return '[File attached]';
            }
            return String(value);
        })();

        if (!parameterDef || parameterDef.type !== 'dropdown') return base;
        const options = Array.isArray(parameterDef.options) ? parameterDef.options : [];
        const optionNameById = new Map(
            options
                .filter((opt: any) => opt && typeof opt.id === 'string')
                .map((opt: any) => [String(opt.id), String(opt.name ?? opt.id)] as const)
        );
        if (Array.isArray(value)) {
            return value
                .map((v) => optionNameById.get(String(v ?? '')) ?? String(v ?? ''))
                .filter(Boolean)
                .join(', ');
        }
        return optionNameById.get(String(value ?? '')) ?? base;
    };

    const normalizeFormEntries = (rawFormData: any): Array<{ id: string; name?: string; value: unknown; resultParamValue?: unknown }> => {
        if (Array.isArray(rawFormData)) {
            return rawFormData
                .filter((entry: any) => entry && typeof entry.id === 'string')
                .map((entry: any) => ({
                    id: entry.id,
                    name: entry.name,
                    value: entry.value,
                    resultParamValue: entry.resultParamValue
                }));
        }
        if (rawFormData && typeof rawFormData === 'object') {
            return Object.entries(rawFormData).map(([id, value]) => ({
                id,
                value
            }));
        }
        return [];
    };

    const getNodeStatusIcon = (state?: string) => {
        switch (state) {
            case 'QUEUED':
                return <PendingIcon fontSize='small' color='disabled' />;
            case 'IN_PROGRESS':
                return <LoopIcon fontSize='small' color='warning' />;
            case 'COMPLETE':
                return <DoneIcon fontSize='small' color='success' />;
            default:
                return <HelpOutlineIcon fontSize='small' color='disabled' />;
        }
    };

    const formatPrice = (value: number) => (Number.isFinite(value) ? `$${value.toFixed(2)}` : '[Price Pending Review]');

    const workflowCard = (
        workflows.map((workflow: any, index: number) => {
            return (
                <Card key={workflow.id || `workflow-${index}`} sx={{m:1, boxShadow: 2}}>
                    <CardContent>
                        <Box sx={{display: 'flex', justifyContent: 'space-between'}}>
                            <Typography sx={{ fontSize: 15 }} color="text.secondary" align="left">{workflow.name}</Typography>
                            <Typography sx={{ fontSize: 13 }} color="text.secondary" align="right">{workflow.id}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 13 }} color="text.secondary" align="left">{workflow.state.replace('_', ' ')}</Typography>
                        <Box sx={{ p: 1, m: 1 }}>
                            {(workflow?.nodes ?? []).map((node: any, nodeIndex: number) => {
                                const paramDefs = Array.isArray(node?.service?.parameters) ? node.service.parameters : [];
                                const servicePrice = calculateServiceCost(
                                    node.service ?? {},
                                    node.formData ?? [],
                                    node?.service?.price ?? null,
                                    data?.ownJobById?.customerCategory
                                );
                                return (
                                    <Box key={`${node.id || nodeIndex}`} sx={{ mb: 1.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {getNodeStatusIcon(node.state)}
                                                <Typography variant='subtitle2'>{node.label}</Typography>
                                            </Box>
                                            <Typography variant='body2' color='text.secondary'>
                                                {formatPrice(servicePrice)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ pl: 3, pt: 0.5 }}>
                                            {normalizeFormEntries(node?.formData).map((entry: any) => {
                                                const paramDef = paramDefs.find((p: any) => p?.id === entry.id);
                                                const label = entry.name || paramDef?.name || entry.id;
                                                const rawValue = entry.value ?? entry.resultParamValue;
                                                return (
                                                    <Typography key={entry.id} variant='body2' color='text.secondary'>
                                                        {label}: {formatParameterValue(paramDef, rawValue)}
                                                    </Typography>
                                                );
                                            })}
                                        </Box>
                                        {nodeIndex < (workflow?.nodes?.length ?? 0) - 1 ? <Divider sx={{ mt: 1 }} /> : null}
                                    </Box>
                                );
                            })}
                        </Box>
                    </CardContent>
                </Card>
            )
        })
    );

    const getParameterFiles = (): Array<{ label: string; filename: string; url?: string }> => {
        const files: Array<{ label: string; filename: string; url?: string }> = [];
        workflows.forEach((workflow: any) => {
            (workflow?.nodes ?? []).forEach((node: any) => {
                const serviceParams = Array.isArray(node?.service?.parameters) ? node.service.parameters : [];
                const fileParamMap = new Map(
                    serviceParams
                        .filter((p: any) => p && p.type === 'file' && typeof p.id === 'string')
                        .map((p: any) => [p.id, p.name ?? p.id])
                );
                if (!fileParamMap.size) return;

                (node?.formData ?? []).forEach((entry: any) => {
                    if (!fileParamMap.has(entry?.id)) return;
                    const paramLabel = fileParamMap.get(entry.id);
                    const rawValues = Array.isArray(entry.value) ? entry.value : [entry.value];
                    rawValues.forEach((raw: any) => {
                        const parsed = typeof raw === 'string' ? (() => {
                            try { return JSON.parse(raw); } catch { return null; }
                        })() : raw;
                        if (!parsed || typeof parsed !== 'object' || !parsed.filename) return;
                        files.push({
                            label: `${node.label} - ${paramLabel}`,
                            filename: parsed.filename,
                            url: parsed.url
                        });
                    });
                });
            });
        });
        return files;
    };

    return (
        <div>
            <Typography variant="h4" sx={{ mt: 2 }}>Job Tracking</Typography>
            <div style={{ textAlign: 'left', padding: '5vh' }}>
                {sowData && (
                    <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
                        <strong>Statement of Work available.</strong> A Statement of Work has been generated for this job. View and download it in the section below.
                    </Alert>
                )}
                <Typography variant="h5" fontWeight="bold">
                    {jobName}
                </Typography>
                <Box sx={{ p: 3, my: 2, bgcolor: jobStatusColor as any, borderRadius: '8px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: -0.5 }}>
                        <Typography>                              {jobStatusIcon} </Typography>
                        <Typography style={{textAlign: 'right'}}> {id}            </Typography>
                    </Box>
                    <Typography>                             <b> {jobState}      </b></Typography>
                    <Typography sx={{ fontSize: 13, mt: 1 }}><i> {jobStatusText} </i></Typography>
                </Box>
                <Box sx={{ mx: 3, fontSize: 13 }}>
                    <p><b>Time:</b>         {jobTime.slice(0, 16).replace('T', ' ')}</p>
                    <p><b>User:</b>         {workflowUsername} ({workflowEmail})</p>
                    <p><b>Organization:</b> {workflowInstitution}</p>
                </Box>
                {attachments.length > 0 && (
                    <Box sx={{ mx: 3, my: 2 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Attachments</Typography>
                        <List dense>
                            {attachments.map((att, idx) => (
                                <ListItem key={`${att.filename}-${idx}`} sx={{ pl: 0 }}>
                                    <ListItemText
                                        primary={
                                            att.url ? (
                                                <MuiLink href={att.url} target="_blank" rel="noopener noreferrer">
                                                    {att.filename}
                                                </MuiLink>
                                            ) : (
                                                att.filename
                                            )
                                        }
                                        secondary={
                                            att.uploadedAt
                                                ? new Date(att.uploadedAt).toLocaleString()
                                                : undefined
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
                {getParameterFiles().length > 0 && (
                    <Box sx={{ mx: 3, my: 2 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Parameter Files</Typography>
                        <List dense>
                            {getParameterFiles().map((f, idx) => (
                                <ListItem key={`${f.label}-${f.filename}-${idx}`} sx={{ pl: 0 }}>
                                    <ListItemText
                                        primary={
                                            f.url ? (
                                                <MuiLink href={f.url} target="_blank" rel="noopener noreferrer">
                                                    {f.filename}
                                                </MuiLink>
                                            ) : (
                                                f.filename
                                            )
                                        }
                                        secondary={f.label}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
                <Box>
                    <Box sx={{ flexDirection: 'column', pt: 1 }}>
                        {workflowCard}
                    </Box>
                </Box>

                {/* SOW Status Indicator and Viewer */}
                {sowData && (
                    <SOWViewer 
                        jobId={id || ''} 
                        sowData={sowData}
                        customerCategory={data?.ownJobById?.customerCategory ?? undefined}
                        currentUser={{ email: workflowEmail, name: workflowUsername, isStaff: false }}
                    />
                )}

                {/* Comments Section */}
                <CommentsSection 
                    jobId={id || ''}
                    currentUser={{
                        email: workflowEmail,
                        isStaff: false
                    }}
                />
            </div>
        </div>
    )
}

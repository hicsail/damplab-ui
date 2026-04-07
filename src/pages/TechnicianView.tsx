import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router';
import { useQuery, useMutation } from '@apollo/client';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { Box, Button, Card, CardContent, Typography, Alert, Chip, Link as MuiLink, List, ListItem, ListItemText, FormControl, InputLabel, MenuItem, Select, Divider } from '@mui/material';
import { AccessTime, Publish, NotInterested, Check, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import PictureAsPdfIcon                               from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon                                from '@mui/icons-material/Description';
import PendingIcon from '@mui/icons-material/Pending';
import LoopIcon from '@mui/icons-material/Loop';
import DoneIcon from '@mui/icons-material/Done';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { GET_JOB_BY_ID, GET_SOW_BY_JOB_ID }         from '../gql/queries';
import { CHANGE_JOB_CUSTOMER_CATEGORY, UPDATE_WORKFLOW_STATE }  from '../gql/mutations';
import { calculateServiceCost } from '../utils/servicePricing';

import JobFeedbackModal           from '../components/JobFeedbackModal';
import JobPDFDocument             from '../components/JobPDFDocument';
import JobInvoiceDocument         from '../components/JobInvoiceDocument';
import SOWGeneratorModal          from '../components/SOWGeneratorModal';
import { SOWViewer }              from '../components/SOWViewer';
import { CommentsSection }        from '../components/CommentsSection';


export default function TechnicianView() {

    const { id }                              = useParams();

    const [workflowName, setWorkflowName]     = useState('');
    const [workflowState, setWorkflowState]   = useState('');
    const [jobName, setJobName]               = useState('');
    const [jobState, setJobState]             = useState('');
    const [jobTime, setJobTime]               = useState('');
    const [jobUsername, setJobUsername]       = useState('');
    const [jobInstitution, setJobInstitution] = useState('');
    const [jobEmail, setJobEmail]             = useState('');
    const [jobNotes, setJobNotes] = useState('');
    const [workflows, setWorklows]            = useState([]);  // ▶ URLSearchParams {}
    const [attachments, setAttachments] = useState<any[]>([]);

    const { loading, error, data, refetch: refetchJob } = useQuery(GET_JOB_BY_ID, {
        variables: { id: id },
        fetchPolicy: 'network-only',
        onCompleted: (data) => {
            console.log('JobById onCompleted attachments:', data?.jobById?.attachments);
            setWorkflowName(data.jobById.workflows[0].name);
            setWorkflowState(data.jobById.workflows[0].state);
            setJobName(data.jobById.name);
            setJobState(data.jobById.state);
            setJobTime(data.jobById.submitted);
            setJobUsername(data.jobById.clientDisplayName || data.jobById.username);
            setJobInstitution(data.jobById.institute);
            setJobEmail(data.jobById.email);
            setJobNotes(data.jobById.notes);
            setWorklows(data.jobById.workflows);
            setAttachments(data.jobById.attachments ?? []);
        },
        onError: (error: any) => {
            // Error handled by error state
        }
    });

    const { data: sowByJobIdResult, loading: sowLoading, refetch: refetchSow } = useQuery(GET_SOW_BY_JOB_ID, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'network-only',
    });

    // Derive from Apollo cache so refetches (e.g. after SOW upsert) update without a full page reload.
    const jobData = data?.jobById ?? null;
    const sowData = jobData?.sow ?? null;
    const sowFullData = sowByJobIdResult?.sowByJobId ?? null;

    const [acceptWorkflowMutation] = useMutation(UPDATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            // Workflow accepted successfully
        },
        onError: (error: any) => {
            // Error handled by error state
        }
    });

    const [changeJobCustomerCategory, { loading: categoryUpdating }] = useMutation(CHANGE_JOB_CUSTOMER_CATEGORY);


    const acceptWorkflow = (workflowId: string) => {

        let updateWorkflowState = {
            workflowId: workflowId,
            state: 'APPROVED'
        }

        acceptWorkflowMutation({
            variables: { updateWorkflowState: updateWorkflowState }
        });

    }

    const [modalOpen, setModalOpen] = useState(false);
    const [sowModalOpen, setSowModalOpen] = useState(false);

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleOpenSOWModal = () => {
        setSowModalOpen(true);
    };

    const handleCloseSOWModal = () => {
        setSowModalOpen(false);
    };
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

    // useEffect(() => {
    //     console.log(fetch('https://plasmapper.ca/api/features', {
    //         body: '{"sequence":"gacggatcgggagatctcccgatcccctatggtgcactctcagtacaatctgctctgatgccgcatagttaagccagtatctgctccctgcttgtgtgttggaggtcgctgagtagtgcgcgagcaaaatttaagctacaacaaggcaaggcttgaccgacaattgcatgaagaatctgcttagggttaggcgttttgcgctgcttcgcgatgtacgggccagatatacgcgttgacattgattattgactagttattaatagtaatcaattacggggtcattagttcatagcccatatatggagttccgcgttacataacttacggtaaatggcccgcctggctgaccgcccaacgacccccgcccattgacgtcaataatgacgtatgttcccatagtaacgccaatagggactttccattgacgtcaatgggtggagtatttacggtaaactgcccacttggcagtacatcaagtgtatcatatgccaagtacgccccctattgacgtcaatgacggtaaatggcccgcctggcattatgcccagtacatgaccttatgggactttcctacttggcagtacatctacgtattagtcatcgctattaccatggtgatgcggttttggcagtacatcaatgggcgtggatagcggtttgactcacggggatttccaagtctccaccccattgacgtcaatgggagtttgttttggcaccaaaatcaacgggactttccaaaatgtcgtaacaactccgccccattgacgcaaatgggcggtaggcgtgtacggtgggaggtctatataagcagagctctctggctaactagagaacccactgcttactggcttatcgaaattaatacgactcactatagggagacccaagctggctagcgtttaaacttaagcttggtaccgagctcggatccactagtccagtgtggtggaattctgcagatatccagcacagtggcggccgctcgagtctagagggcccgtttaaacccgctgatcagcctcgactgtgccttctagttgccagccatctgttgtttgcccctcccccgtgccttccttgaccctggaaggtgccactcccactgtcctttcctaataaaatgaggaaattgcatcgcattgtctgagtaggtgtcattctattctggggggtggggtggggcaggacagcaagggggaggattgggaagacaatagcaggcatgctggggatgcggtgggctctatggcttctgaggcggaaagaaccagctggggctctagggggtatccccacgcgccctgtagcggcgcattaagcgcggcgggtgtggtggttacgcgcagcgtgaccgctacacttgccagcgccctagcgcccgctcctttcgctttcttcccttcctttctcgccacgttcgccggctttccccgtcaagctctaaatcgggggctccctttagggttccgatttagtgctttacggcacctcgaccccaaaaaacttgattagggtgatggttcacgtagtgggccatcgccctgatagacggtttttcgccctttgacgttggagtccacgttctttaatagtggactcttgttccaaactggaacaacactcaaccctatctcggtctattcttttgatttataagggattttgccgatttcggcctattggttaaaaaatgagctgatttaacaaaaatttaacgcgaattaattctgtggaatgtgtgtcagttagggtgtggaaagtccccaggctccccagcaggcagaagtatgcaaagcatgcatctcaattagtcagcaaccaggtgtggaaagtccccaggctccccagcaggcagaagtatgcaaagcatgcatctcaattagtcagcaaccatagtcccgcccctaactccgcccatcccgcccctaactccgcccagttccgcccattctccgccccatggctgactaattttttttatttatgcagaggccgaggccgcctctgcctctgagctattccagaagtagtgaggaggcttttttggaggcctaggcttttgcaaaaagctcccgggagcttgtatatccattttcggatctgatcaagagacaggatgaggatcgtttcgcatgattgaacaagatggattgcacgcaggttctccggccgcttgggtggagaggctattcggctatgactgggcacaacagacaatcggctgctctgatgccgccgtgttccggctgtcagcgcaggggcgcccggttctttttgtcaagaccgacctgtccggtgccctgaatgaactgcaggacgaggcagcgcggctatcgtggctggccacgacgggcgttccttgcgcagctgtgctcgacgttgtcactgaagcgggaagggactggctgctattgggcgaagtgccggggcaggatctcctgtcatctcaccttgctcctgccgagaaagtatccatcatggctgatgcaatgcggcggctgcatacgcttgatccggctacctgcccattcgaccaccaagcgaaacatcgcatcgagcgagcacgtactcggatggaagccggtcttgtcgatcaggatgatctggacgaagagcatcaggggctcgcgccagccgaactgttcgccaggctcaaggcgcgcatgcccgacggcgaggatctcgtcgtgacccatggcgatgcctgcttgccgaatatcatggtggaaaatggccgcttttctggattcatcgactgtggccggctgggtgtggcggaccgctatcaggacatagcgttggctacccgtgatattgctgaagagcttggcggcgaatgggctgaccgcttcctcgtgctttacggtatcgccgctcccgattcgcagcgcatcgccttctatcgccttcttgacgagttcttctgagcgggactctggggttcgaaatgaccgaccaagcgacgcccaacctgccatcacgagatttcgattccaccgccgccttctatgaaaggttgggcttcggaatcgttttccgggacgccggctggatgatcctccagcgcggggatctcatgctggagttcttcgcccaccccaacttgtttattgcagcttataatggttacaaataaagcaatagcatcacaaatttcacaaataaagcatttttttcactgcattctagttgtggtttgtccaaactcatcaatgtatcttatcatgtctgtataccgtcgacctctagctagagcttggcgtaatcatggtcatagctgtttcctgtgtgaaattgttatccgctcacaattccacacaacatacgagccggaagcataaagtgtaaagcctggggtgcctaatgagtgagctaactcacattaattgcgttgcgctcactgcccgctttccagtcgggaaacctgtcgtgccagctgcattaatgaatcggccaacgcgcggggagaggcggtttgcgtattgggcgctcttccgcttcctcgctcactgactcgctgcgctcggtcgttcggctgcggcgagcggtatcagctcactcaaaggcggtaatacggttatccacagaatcaggggataacgcaggaaagaacatgtgagcaaaaggccagcaaaaggccaggaaccgtaaaaaggccgcgttgctggcgtttttccataggctccgcccccctgacgagcatcacaaaaatcgacgctcaagtcagaggtggcgaaacccgacaggactataaagataccaggcgtttccccctggaagctccctcgtgcgctctcctgttccgaccctgccgcttaccggatacctgtccgcctttctcccttcgggaagcgtggcgctttctcatagctcacgctgtaggtatctcagttcggtgtaggtcgttcgctccaagctgggctgtgtgcacgaaccccccgttcagcccgaccgctgcgccttatccggtaactatcgtcttgagtccaacccggtaagacacgacttatcgccactggcagcagccactggtaacaggattagcagagcgaggtatgtaggcggtgctacagagttcttgaagtggtggcctaactacggctacactagaagaacagtatttggtatctgcgctctgctgaagccagttaccttcggaaaaagagttggtagctcttgatccggcaaacaaaccaccgctggtagcggtttttttgtttgcaagcagcagattacgcgcagaaaaaaaggatctcaagaagatcctttgatcttttctacggggtctgacgctcagtggaacgaaaactcacgttaagggattttggtcatgagattatcaaaaaggatcttcacctagatccttttaaattaaaaatgaagttttaaatcaatctaaagtatatatgagtaaacttggtctgacagttaccaatgcttaatcagtgaggcacctatctcagcgatctgtctatttcgttcatccatagttgcctgactccccgtcgtgtagataactacgatacgggagggcttaccatctggccccagtgctgcaatgataccgcgagacccacgctcaccggctccagatttatcagcaataaaccagccagccggaagggccgagcgcagaagtggtcctgcaactttatccgcctccatccagtctattaattgttgccgggaagctagagtaagtagttcgccagttaatagtttgcgcaacgttgttgccattgctacaggcatcgtggtgtcacgctcgtcgtttggtatggcttcattcagctccggttcccaacgatcaaggcgagttacatgatcccccatgttgtgcaaaaaagcggttagctccttcggtcctccgatcgttgtcagaagtaagttggccgcagtgttatcactcatggttatggcagcactgcataattctcttactgtcatgccatccgtaagatgcttttctgtgactggtgagtactcaaccaagtcattctgagaatagtgtatgcggcgaccgagttgctcttgcccggcgtcaatacgggataataccgcgccacatagcagaactttaaaagtgctcatcattggaaaacgttcttcggggcgaaaactctcaaggatcttaccgctgttgagatccagttcgatgtaacccactcgtgcacccaactgatcttcagcatcttttactttcaccagcgtttctgggtgagcaaaaacaggaaggcaaaatgccgcaaaaaagggaataagggcgacacggaaatgttgaatactcatactcttcctttttcaatattattgaagcatttatcagggttattgtctcatgagcggatacatatttgaatgtatttagaaaaataaacaaataggggttccgcgcacatttccccgaaaagtgccacctgacgtc"}',
    //         headers: {
    //             Accept: 'application/json, text/plain, */*',
    //             'Origin': 'https://plasmapper.wishartlab.com',
    //             'Referer': 'https://plasmapper.wishartlab.com/',
    //             'Content-Type': 'application/json'
    //         },
    //         method: "POST"
    //     }))
    // })

    const jobStatus = () => {
        const submitText = "The job was submitted to the DAMP lab and is awaiting review.";
        const createText = "The job is currently being created.";
        const acceptText = "The job was accepted by the DAMP Lab. The client will be asked to sign and return the SOW.";
        const rejectText=  "The job was rejected by the DAMP Lab. The client will be asked to resubmit the job with changes.";
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
    const jobStatusIcon = jobStatus()[1];
    const jobStatusText = jobStatus()[2];

    const customerCategoryOptions: Array<{ value: string; label: string }> = [
        { value: 'INTERNAL_CUSTOMERS', label: 'Internal customers' },
        { value: 'EXTERNAL_CUSTOMER_ACADEMIC', label: 'External (Academic)' },
        { value: 'EXTERNAL_CUSTOMER_MARKET', label: 'External (Market)' },
        { value: 'EXTERNAL_CUSTOMER_NO_SALARY', label: 'External (No salary)' },
    ];

    const currentCustomerCategory = jobData?.customerCategory ?? 'EXTERNAL_CUSTOMER_MARKET';

    const handleCustomerCategoryChange = async (nextCategory: string) => {
        try {
            if (!id) return;
            await changeJobCustomerCategory({
                variables: { jobId: id as string, customerCategory: nextCategory },
            });
            await Promise.all([refetchJob(), refetchSow()]);
        } catch (e) {
            console.error('Failed to update job customer category:', e);
        }
    };

    // const workflowCard = (
    //     <Card>
    //         <CardContent>
    //             <Typography sx={{ fontSize: 12 }} color="text.secondary" align="left">{workflowName}</Typography>
    //             <Typography sx={{ fontSize: 12 }} color="text.secondary" align="left">{workflowState}</Typography>
    //             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', p: 1, m: 1 }}>
    //                 {
    //                     workflows.map((workflow: any) => {
    //                         return (
    //                             <WorkflowStepper workflow={transformGQLToWorkflow(workflow).nodes} key={workflow.id} />
    //                         )
    //                     })
    //                 }
    //             </Box>
    //         </CardContent>
    //     </Card>
    // );

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
                            <Typography sx={{ fontSize: 15 }} color="text.secondary" align="left">{workflowName}</Typography>
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
                                    jobData?.customerCategory
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

    return (
        <div>
            <Typography variant="h4" sx={{ mt: 2 }}>Job Tracking</Typography>
            <div style={{ textAlign: 'left', padding: '5vh' }}>
                {sowData && (
                    <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
                        <strong>Statement of Work generated.</strong> This job has an SOW. You can view, edit, or regenerate it below.
                    </Alert>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
                    <Typography variant="h5" fontWeight="bold">
                        {jobName}
                        {sowData && (
                            <Chip label="SOW generated" color="success" size="small" sx={{ ml: 1.5, fontWeight: 600 }} />
                        )}
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 260 }} disabled={categoryUpdating}>
                        <InputLabel id="pricing-category-label">Pricing category</InputLabel>
                        <Select
                            labelId="pricing-category-label"
                            value={currentCustomerCategory}
                            label="Pricing category"
                            onChange={(e) => handleCustomerCategoryChange(String(e.target.value))}
                        >
                            {customerCategoryOptions.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button color='primary' sx={{alignContent: 'right', mr: 1}}>
                        <PictureAsPdfIcon/>&nbsp;
                        {id ? (
                            <PDFDownloadLink
                                document={
                                    <JobPDFDocument
                                        jobId={id}
                                        jobName={jobName}
                                        jobUsername={jobUsername}
                                        jobEmail={jobEmail}
                                        jobInstitution={jobInstitution}
                                        jobNotes={jobNotes}
                                        jobTime={jobTime}
                                        workflows={workflows}
                                    />
                                }
                                fileName={`DAMP-Order-${id}.pdf`}
                            >
                                {({ loading }) => (loading ? 'Loading document...' : 'Download Summary')}
                            </PDFDownloadLink>
                        ) : (
                            'Download Summary'
                        )}
                    </Button>
                    <Button 
                        color={sowData ? 'primary' : 'secondary'}
                        variant='contained'
                        startIcon={<DescriptionIcon />}
                        onClick={handleOpenSOWModal}
                        disabled={!jobData}
                        sx={{ mr: 1 }}
                    >
                        {sowData ? 'View / Edit SOW' : 'Generate SOW'}
                    </Button>
                    <Button
                        color={sowFullData ? 'primary' : 'secondary'}
                        variant="contained"
                        startIcon={<PictureAsPdfIcon />}
                        sx={{ mr: 1 }}
                        disabled={!sowFullData || sowLoading}
                    >
                        {id && sowFullData ? (
                            <PDFDownloadLink
                                document={
                                    <JobInvoiceDocument
                                        jobId={id}
                                        jobName={jobName}
                                        customerCategory={jobData?.customerCategory ?? undefined}
                                        sow={sowFullData}
                                    />
                                }
                                fileName={`Invoice-${id}.pdf`}
                            >
                                {({ loading }) => (loading ? 'Loading Invoice...' : 'Generate Invoice')}
                            </PDFDownloadLink>
                        ) : (
                            'Generate Invoice'
                        )}
                    </Button>
                    <Button 
                        variant="contained"
                        color="error"
                        onClick={handleOpenModal}
                        disabled={jobState !== 'SUBMITTED'}
                    >
                        Review Job
                    </Button>
                </Box>
                <Box sx={{ p: 3, my: 2, bgcolor: jobStatusColor as any, borderRadius: '8px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: -0.5 }}>
                        <Typography>
                            {jobStatusIcon}
                        </Typography>
                        <Typography style={{textAlign: 'right'}}>
                            <b>Job ID:</b> {id}
                        </Typography>
                    </Box>
                    <Typography>
                        <b>{jobState}</b>
                    </Typography>
                    <Typography sx={{ fontSize: 13, mt: 1 }}>
                        <i>{jobStatusText}</i>
                    </Typography>
                </Box>
                <Box sx={{ mx: 3, fontSize: 13 }}>
                    <p><b>Time:</b> {jobTime.slice(0, 16).replace('T', ' ')}</p>
                    <p><b>User:</b> {jobUsername} ({jobEmail})</p>
                    <p><b>Organization:</b> {jobInstitution}</p>
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

                {/* SOW Status Indicator */}
                {sowData && (
                    <SOWViewer 
                        jobId={id || ''} 
                        sowData={sowData}
                        customerCategory={jobData?.customerCategory ?? undefined}
                        currentUser={{ email: jobEmail, name: jobUsername, isStaff: true }}
                    />
                )}

                <Box>
                    <Box sx={{ flexDirection: 'column', pt: 1 }}>
                        {workflowCard}
                    </Box>
                </Box>

                {/* Comments Section */}
                <CommentsSection 
                    jobId={id || ''}
                    currentUser={{
                        email: 'technician@bu.edu', // TODO: Get from auth context
                        isStaff: true
                    }}
                />

                <JobFeedbackModal open={modalOpen} onClose={handleCloseModal} id={id}/>
                <SOWGeneratorModal 
                    open={sowModalOpen} 
                    onClose={handleCloseSOWModal} 
                    jobData={jobData}
                />
            </div>
        </div>
    )
}

import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router';
import { useApolloClient, useQuery, useMutation } from '@apollo/client';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { Autocomplete, Box, Button, Card, CardContent, Typography, Alert, Chip, Link as MuiLink, List, ListItem, ListItemText, FormControl, InputLabel, MenuItem, Select, Divider, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, FormHelperText, Checkbox, FormControlLabel, Snackbar } from '@mui/material';
import { AccessTime, Publish, NotInterested, Check, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import PictureAsPdfIcon                               from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon                                from '@mui/icons-material/Description';
import PendingIcon from '@mui/icons-material/Pending';
import LoopIcon from '@mui/icons-material/Loop';
import DoneIcon from '@mui/icons-material/Done';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { DeleteForeverSharp, PlusOne } from '@mui/icons-material';

import { GET_INVOICES_BY_JOB_ID, GET_JOB_BY_ID, GET_SERVICES, GET_SOW_BY_JOB_ID }         from '../gql/queries';
import { ADD_WORKFLOW_TO_JOB, CHANGE_JOB_CUSTOMER_CATEGORY, CREATE_INVOICE, CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS, UPDATE_WORKFLOW_STATE }  from '../gql/mutations';
import { calculateServiceCost } from '../utils/servicePricing';

import JobFeedbackModal           from '../components/JobFeedbackModal';
import JobPDFDocument             from '../components/JobPDFDocument';
import JobInvoiceDocument         from '../components/JobInvoiceDocument';
import SOWGeneratorModal          from '../components/SOWGeneratorModal';
import { SOWViewer }              from '../components/SOWViewer';
import { CommentsSection }        from '../components/CommentsSection';
import { generateFormDataFromParams } from '../controllers/ReactFlowEvents';

type PendingParamFile = {
    __kind: 'pending-file';
    localId: string;
    file: File;
    filename: string;
    contentType: string;
    size: number;
};

const isPendingParamFile = (value: unknown): value is PendingParamFile =>
    !!value &&
    typeof value === 'object' &&
    (value as PendingParamFile).__kind === 'pending-file' &&
    (value as PendingParamFile).file instanceof File;

const toPendingFiles = (files: FileList | null): PendingParamFile[] => {
    if (!files) return [];
    return Array.from(files).map((file) => ({
        __kind: 'pending-file',
        localId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
    }));
};

export default function TechnicianView() {

    const { id }                              = useParams();
    const apolloClient = useApolloClient();

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
        skip: !id,
        fetchPolicy: 'network-only',
        onError: (error: any) => {
            // Error handled by error state
        }
    });

    // Keep local UI in sync on every fetch/refetch (onCompleted alone does not always run on refetch).
    useEffect(() => {
        const job = data?.jobById;
        if (!job) return;
        setJobName(job.name ?? '');
        setJobState(job.state ?? '');
        setJobTime(job.submitted ?? '');
        setJobUsername(job.clientDisplayName || job.username || '');
        setJobInstitution(job.institute ?? '');
        setJobEmail(job.email ?? '');
        setJobNotes(job.notes ?? '');
        setWorklows(job.workflows ?? []);
        setAttachments(job.attachments ?? []);
        const wfs = job.workflows ?? [];
        if (wfs.length > 0) {
            setWorkflowName(wfs[0].name ?? '');
            setWorkflowState(wfs[0].state ?? '');
        }
    }, [data?.jobById]);

    const { data: sowByJobIdResult, loading: sowLoading, refetch: refetchSow } = useQuery(GET_SOW_BY_JOB_ID, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'network-only',
    });

    const { data: servicesResult } = useQuery(GET_SERVICES, {
        fetchPolicy: 'cache-first'
    });
    const services = servicesResult?.services ?? [];

    const { data: invoicesResult, loading: invoicesLoading, refetch: refetchInvoices } = useQuery(GET_INVOICES_BY_JOB_ID, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'network-only',
    });
    const invoices = invoicesResult?.invoicesByJobId ?? [];

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

    const [addWorkflowToJob, { loading: addingWorkflow }] = useMutation(ADD_WORKFLOW_TO_JOB);

    const [createInvoice, { loading: creatingInvoice }] = useMutation(CREATE_INVOICE);

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

    const [addServiceOpen, setAddServiceOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<any | null>(null);
    const [draftNodeId, setDraftNodeId] = useState<string>(() => Math.random().toString(36).substring(2, 9));
    const [draftFormData, setDraftFormData] = useState<any[]>([]);
    const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});

    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [selectedInvoiceServiceIds, setSelectedInvoiceServiceIds] = useState<string[]>([]);

    const [addServiceSnackbar, setAddServiceSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        const svcIds = (sowFullData?.services ?? []).map((s: any) => String(s?.id ?? '')).filter(Boolean);
        setSelectedInvoiceServiceIds(svcIds);
    }, [sowFullData?.services]);

    const openInvoiceDialog = () => {
        if (!sowFullData) return;
        setInvoiceDialogOpen(true);
    };
    const closeInvoiceDialog = () => setInvoiceDialogOpen(false);

    const toggleInvoiceService = (serviceId: string) => {
        setSelectedInvoiceServiceIds((prev) =>
            prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
        );
    };

    const submitCreateInvoice = async () => {
        if (!id) return;
        const serviceIds = selectedInvoiceServiceIds.filter(Boolean);
        if (serviceIds.length === 0) return;
        await createInvoice({
            variables: {
                input: { jobId: id as string, serviceIds }
            }
        });
        await refetchInvoices();
        setInvoiceDialogOpen(false);
    };

    const openAddService = () => {
        setSelectedService(null);
        const nodeId = Math.random().toString(36).substring(2, 9);
        setDraftNodeId(nodeId);
        setDraftFormData([]);
        setDraftErrors({});
        setAddServiceOpen(true);
    };

    const closeAddService = () => {
        if (addingWorkflow) return;
        setAddServiceOpen(false);
    };

    const validateDraft = (formData: any[]): Record<string, string> => {
        const errors: Record<string, string> = {};
        formData.forEach((p: any) => {
            if (p?.paramType === 'result') return;
            if (!p?.required) return;
            const val = p.value;
            const isMulti = p.allowMultipleValues === true || Array.isArray(val);
            if (p.type === 'file') {
                if (isMulti) {
                    const arr = Array.isArray(val) ? val : [];
                    const has = arr.length > 0;
                    if (!has) errors[p.id] = 'Required';
                } else {
                    if (!val) errors[p.id] = 'Required';
                }
                return;
            }
            if (isMulti) {
                const arr = Array.isArray(val) ? val : [];
                const has = arr.some((v: any) => v != null && String(v).trim() !== '');
                if (!has) errors[p.id] = 'Required (at least one value)';
                return;
            }
            if (val == null || String(val).trim() === '') {
                errors[p.id] = 'Required';
            }
        });
        return errors;
    };

    const ensureDraftInitialized = (svc: any) => {
        const nodeId = draftNodeId;
        const next = generateFormDataFromParams(Array.isArray(svc?.parameters) ? svc.parameters : [], nodeId);
        setDraftFormData(next);
        setDraftErrors(validateDraft(next));
    };

    const updateDraftValue = (paramId: string, value: any) => {
        setDraftFormData((prev) => {
            const next = prev.map((p: any) => (p.id === paramId ? { ...p, value } : p));
            setDraftErrors(validateDraft(next));
            return next;
        });
    };

    const uploadDraftParamFilesIfNeeded = async (formData: any[]): Promise<any[]> => {
        const fileParams = formData.filter((p: any) => p?.type === 'file');
        const filesToUpload: Array<{ clientToken: string; file: File; contentType: string; size: number }> = [];
        const tokenByParam = new Map<string, string | string[]>();

        const addFileForUpload = (file: PendingParamFile): string => {
            const clientToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            filesToUpload.push({
                clientToken,
                file: file.file,
                contentType: file.contentType || 'application/octet-stream',
                size: file.size,
            });
            return clientToken;
        };

        fileParams.forEach((p: any) => {
            const v = p.value;
            if (Array.isArray(v)) {
                const tokens = v.filter(isPendingParamFile).map((f: PendingParamFile) => addFileForUpload(f));
                if (tokens.length) tokenByParam.set(p.id, tokens);
                return;
            }
            if (isPendingParamFile(v)) {
                tokenByParam.set(p.id, addFileForUpload(v));
            }
        });

        if (filesToUpload.length === 0) return formData;

        const uploadMetaResult = await apolloClient.mutate({
            mutation: CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS,
            variables: {
                files: filesToUpload.map((f) => ({
                    clientToken: f.clientToken,
                    filename: f.file.name,
                    contentType: f.contentType,
                    size: f.size,
                })),
            },
        });

        const uploads: Array<{ clientToken: string; filename: string; uploadUrl: string; key: string; contentType: string; size: number }> =
            uploadMetaResult.data?.createWorkflowParameterUploadUrls ?? [];
        const uploadByToken = new Map(uploads.map((u) => [u.clientToken, u]));

        await Promise.all(
            filesToUpload.map(async (f) => {
                const upload = uploadByToken.get(f.clientToken);
                if (!upload) throw new Error(`Upload URL not found for file token ${f.clientToken}`);
                const resp = await fetch(upload.uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': upload.contentType || 'application/octet-stream' },
                    body: f.file,
                });
                if (!resp.ok) {
                    throw new Error(`Failed to upload parameter file ${f.file.name}`);
                }
            })
        );

        const uploadedMetaByToken = new Map<string, any>();
        uploads.forEach((u) => {
            uploadedMetaByToken.set(u.clientToken, {
                filename: u.filename,
                key: u.key,
                contentType: u.contentType,
                size: u.size,
                uploadedAt: new Date().toISOString(),
            });
        });

        return formData.map((p: any) => {
            if (!tokenByParam.has(p.id)) return p;
            const tokenOrTokens = tokenByParam.get(p.id);
            if (Array.isArray(tokenOrTokens)) {
                const metas = tokenOrTokens.map((t) => uploadedMetaByToken.get(t)).filter(Boolean).map((m) => JSON.stringify(m));
                return { ...p, value: metas };
            }
            const meta = uploadedMetaByToken.get(tokenOrTokens);
            return { ...p, value: meta ? JSON.stringify(meta) : null };
        });
    };

    const handleSaveAddedService = async () => {
        if (!id || !selectedService) return;
        const addedServiceName = selectedService.name ?? 'Service';
        const errors = validateDraft(draftFormData);
        setDraftErrors(errors);
        if (Object.keys(errors).length > 0) return;

        try {
            const withUploads = await uploadDraftParamFilesIfNeeded(draftFormData);

            const workflowInput = {
                name: `Added-${selectedService.name}-${Date.now()}`,
                nodes: [
                    {
                        id: draftNodeId,
                        label: selectedService.name,
                        additionalInstructions: '',
                        formData: withUploads.map((p: any) => ({ id: p.id, value: p.value })),
                        reactNode: {},
                        serviceId: selectedService.id,
                    },
                ],
                edges: [],
            };

            await addWorkflowToJob({
                variables: { jobId: id as string, workflow: workflowInput },
                refetchQueries: [
                    { query: GET_JOB_BY_ID, variables: { id } },
                    { query: GET_SOW_BY_JOB_ID, variables: { jobId: id } },
                ],
                awaitRefetchQueries: true,
            });

            const [jobRefetch] = await Promise.all([refetchJob({ variables: { id } }), refetchSow()]);
            const nextWorkflows = jobRefetch.data?.jobById?.workflows;
            if (Array.isArray(nextWorkflows)) {
                setWorklows(nextWorkflows);
            }

            setAddServiceOpen(false);
            setSelectedService(null);
            setDraftFormData([]);
            setAddServiceSnackbar({
                open: true,
                severity: 'success',
                message: `Service “${addedServiceName}” was added to this job.`,
            });
        } catch (e) {
            console.error('Failed to add service to job:', e);
            setAddServiceSnackbar({
                open: true,
                severity: 'error',
                message: 'Could not add the service. Please try again.',
            });
        }
    };
    const getParameterFiles = (): Array<{ label: string; filename: string; url?: string }> => {
        const files: Array<{ label: string; filename: string; url?: string }> = [];
        workflows.forEach((workflow: any) => {
            (workflow?.nodes ?? []).forEach((node: any) => {
                const serviceParams = Array.isArray(node?.service?.parameters) ? node.service.parameters : [];
                const fileParamMap = new Map(
                    serviceParams
                        .filter((p: any) => p && p.type === 'file' && typeof p.id === 'string')
                        .map((p: any) => [p.id, p.name ?? 'File upload'])
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
                .map((opt: any) => [String(opt.id), String(opt.name ?? 'Option')] as const)
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
                            <Typography sx={{ fontSize: 15 }} color="text.secondary" align="left">{workflow?.name ?? workflowName}</Typography>
                            <Box />
                        </Box>
                        <Typography sx={{ fontSize: 13 }} color="text.secondary" align="left">{(workflow.state ?? '').replace('_', ' ')}</Typography>
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
                                                const label = entry.name || paramDef?.name || 'Parameter';
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
                        onClick={openInvoiceDialog}
                    >
                        Create Invoice
                    </Button>
                    <Button
                        color={invoices?.length ? 'primary' : 'secondary'}
                        variant="outlined"
                        startIcon={<PictureAsPdfIcon />}
                        sx={{ mr: 1 }}
                        disabled={!invoices?.length || invoicesLoading || !sowFullData}
                    >
                        {invoices?.length && id && sowFullData ? (
                            <PDFDownloadLink
                                document={
                                    <JobInvoiceDocument
                                        jobId={id}
                                        jobDisplayId={jobData?.jobId ?? null}
                                        jobName={jobName}
                                        customerCategory={jobData?.customerCategory ?? undefined}
                                        sow={sowFullData}
                                        invoice={invoices[0]}
                                    />
                                }
                                fileName={`Invoice-${(invoices[0]?.invoiceNumber ?? id) || id}.pdf`}
                            >
                                {({ loading }) => (loading ? 'Loading invoice...' : 'Download Latest Invoice')}
                            </PDFDownloadLink>
                        ) : (
                            'Download Latest Invoice'
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
                    <Button
                        variant="outlined"
                        onClick={openAddService}
                        disabled={!jobData}
                        sx={{ textTransform: 'none' }}
                    >
                        Add service
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
                        jobDisplayId={jobData?.jobId ?? null}
                        sowData={sowData}
                        customerCategory={jobData?.customerCategory ?? undefined}
                        currentUser={{ email: jobEmail, name: jobUsername, isStaff: true }}
                    />
                )}

                {/* Invoices */}
                <Box sx={{ mx: 3, my: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Invoices</Typography>
                    {!invoices?.length ? (
                        <Typography variant="body2" color="text.secondary">
                            No invoices have been generated for this job yet.
                        </Typography>
                    ) : (
                        <List dense>
                            {invoices.map((inv: any, idx: number) => (
                                <ListItem key={inv.id || idx} sx={{ pl: 0 }}>
                                    <ListItemText
                                        primary={
                                            id && sowFullData ? (
                                                <PDFDownloadLink
                                                    document={
                                                        <JobInvoiceDocument
                                                            jobId={id}
                                                            jobDisplayId={jobData?.jobId ?? null}
                                                            jobName={jobName}
                                                            customerCategory={jobData?.customerCategory ?? undefined}
                                                            sow={sowFullData}
                                                            invoice={inv}
                                                        />
                                                    }
                                                    fileName={`Invoice-${inv.invoiceNumber || inv.id || id}.pdf`}
                                                >
                                                    {({ loading }) =>
                                                        loading
                                                            ? 'Loading...'
                                                            : `Invoice ${inv.invoiceNumber || ''}`.trim()
                                                    }
                                                </PDFDownloadLink>
                                            ) : (
                                                `Invoice ${inv.invoiceNumber || inv.id || ''}`.trim()
                                            )
                                        }
                                        secondary={
                                            `${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleString() : ''}${inv.totalCost != null ? ` • $${Number(inv.totalCost).toFixed(2)}` : ''}`
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>

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

                <Dialog open={invoiceDialogOpen} onClose={closeInvoiceDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>Create invoice (select services)</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Choose which SOW services to include on this invoice. This will create a saved invoice visible to the client.
                        </Typography>
                        {(sowFullData?.services ?? []).map((s: any, idx: number) => {
                            const sid = String(s?.id ?? '');
                            const checked = selectedInvoiceServiceIds.includes(sid);
                            return (
                                <Box key={sid || idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.5 }}>
                                    <FormControlLabel
                                        control={<Checkbox checked={checked} onChange={() => toggleInvoiceService(sid)} />}
                                        label={
                                            <Box>
                                                <Typography variant="subtitle2">{s?.name ?? 'Service'}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {s?.description ?? ''}
                                                    {s?.cost != null ? ` • $${Number(s.cost).toFixed(2)}` : ''}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </Box>
                            );
                        })}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeInvoiceDialog} disabled={creatingInvoice}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={submitCreateInvoice}
                            disabled={creatingInvoice || selectedInvoiceServiceIds.length === 0}
                        >
                            {creatingInvoice ? 'Creating...' : 'Create Invoice'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={addServiceOpen} onClose={closeAddService} maxWidth="md" fullWidth>
                    <DialogTitle>Add service to job</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Search for an existing service, fill out its parameters, then save to append it to this job.
                        </Typography>

                        <Autocomplete
                            options={services}
                            value={selectedService}
                            onChange={(_e, v) => {
                                setSelectedService(v);
                                if (v) ensureDraftInitialized(v);
                            }}
                            isOptionEqualToValue={(a, b) => String(a?.id ?? '') === String(b?.id ?? '')}
                            getOptionLabel={(opt: any) => (opt && typeof opt === 'object' ? opt?.name ?? '' : '')}
                            renderInput={(params) => <TextField {...params} label="Service" placeholder="Type to filter services…" />}
                            slotProps={{
                                popper: {
                                    sx: { zIndex: (theme) => theme.zIndex.snackbar },
                                },
                            }}
                            sx={{ mb: 3 }}
                        />

                        {selectedService && (
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                {draftFormData
                                    .filter((p: any) => p?.paramType !== 'result')
                                    .map((param: any) => {
                                        const isMulti = param.allowMultipleValues === true || Array.isArray(param.value);
                                        const err = draftErrors[param.id];

                                        if (param.type === 'table') {
                                            return (
                                                <Box key={param.id} sx={{ gridColumn: '1 / -1' }}>
                                                    <Alert severity="info">Table parameter “{param.name}” is informational.</Alert>
                                                </Box>
                                            );
                                        }

                                        if (param.type === 'dropdown') {
                                            const options = Array.isArray(param.options) ? param.options : [];
                                            if (isMulti) {
                                                const values = Array.isArray(param.value) ? param.value : [''];
                                                return (
                                                    <Box key={param.id}>
                                                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                                                            {param.name}{param.required ? ' *' : ''}
                                                        </Typography>
                                                        {values.map((val: any, idx: number) => (
                                                            <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                                                <FormControl size="small" fullWidth error={idx === 0 && Boolean(err)}>
                                                                    <InputLabel>{idx === 0 ? param.name : `${param.name} (${idx + 1})`}</InputLabel>
                                                                    <Select
                                                                        label={idx === 0 ? param.name : `${param.name} (${idx + 1})`}
                                                                        value={val ?? ''}
                                                                        onChange={(e) => {
                                                                            const next = [...values];
                                                                            next[idx] = e.target.value;
                                                                            updateDraftValue(param.id, next);
                                                                        }}
                                                                    >
                                                                        {options.map((o: any) => (
                                                                            <MenuItem key={o.id} value={o.id}>
                                                                                {o.name}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                    {idx === 0 ? (
                                                                        <FormHelperText>
                                                                            {err ? err : (param.description ?? '')}
                                                                        </FormHelperText>
                                                                    ) : null}
                                                                </FormControl>
                                                                {idx > 0 && (
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => updateDraftValue(param.id, values.filter((_: any, i: number) => i !== idx))}
                                                                    >
                                                                        <DeleteForeverSharp fontSize="small" />
                                                                    </IconButton>
                                                                )}
                                                                {idx === 0 && (
                                                                    <IconButton size="small" onClick={() => updateDraftValue(param.id, [...values, ''])}>
                                                                        <PlusOne fontSize="small" />
                                                                    </IconButton>
                                                                )}
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                );
                                            }

                                            return (
                                                <FormControl key={param.id} size="small" fullWidth error={Boolean(err)}>
                                                    <InputLabel>{param.name}{param.required ? ' *' : ''}</InputLabel>
                                                    <Select
                                                        label={`${param.name}${param.required ? ' *' : ''}`}
                                                        value={param.value ?? ''}
                                                        onChange={(e) => updateDraftValue(param.id, e.target.value)}
                                                    >
                                                        {options.map((o: any) => (
                                                            <MenuItem key={o.id} value={o.id}>
                                                                {o.name}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    <FormHelperText>{err ? err : (param.description ?? '')}</FormHelperText>
                                                </FormControl>
                                            );
                                        }

                                        if (param.type === 'file') {
                                            if (isMulti) {
                                                const files = Array.isArray(param.value) ? param.value : [];
                                                return (
                                                    <Box key={param.id}>
                                                        <Button variant="outlined" component="label" size="small" sx={{ textTransform: 'none' }}>
                                                            {param.name}{param.required ? ' *' : ''}
                                                            <input
                                                                hidden
                                                                type="file"
                                                                multiple
                                                                onChange={(e) => {
                                                                    const selected = toPendingFiles(e.target.files);
                                                                    updateDraftValue(param.id, [...files, ...selected]);
                                                                    e.currentTarget.value = '';
                                                                }}
                                                            />
                                                        </Button>
                                                        <FormHelperText error={Boolean(err)}>{err ? err : (param.description ?? '')}</FormHelperText>
                                                        <Box sx={{ mt: 1 }}>
                                                            {files.map((f: any, idx: number) => (
                                                                <Box key={f?.localId ?? idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        {isPendingParamFile(f) ? f.filename : 'Uploaded file'}
                                                                    </Typography>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => updateDraftValue(param.id, files.filter((_: any, i: number) => i !== idx))}
                                                                    >
                                                                        <DeleteForeverSharp fontSize="small" />
                                                                    </IconButton>
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                );
                                            }

                                            const v = param.value;
                                            return (
                                                <Box key={param.id}>
                                                    <Button variant="outlined" component="label" size="small" sx={{ textTransform: 'none' }}>
                                                        {param.name}{param.required ? ' *' : ''}
                                                        <input
                                                            hidden
                                                            type="file"
                                                            onChange={(e) => {
                                                                const selected = toPendingFiles(e.target.files);
                                                                updateDraftValue(param.id, selected[0] ?? null);
                                                                e.currentTarget.value = '';
                                                            }}
                                                        />
                                                    </Button>
                                                    <FormHelperText error={Boolean(err)}>{err ? err : (param.description ?? '')}</FormHelperText>
                                                    {v ? (
                                                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {isPendingParamFile(v) ? v.filename : 'Uploaded file'}
                                                            </Typography>
                                                            <IconButton size="small" onClick={() => updateDraftValue(param.id, null)}>
                                                                <DeleteForeverSharp fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    ) : null}
                                                </Box>
                                            );
                                        }

                                        if (isMulti) {
                                            const values = Array.isArray(param.value) ? param.value : [''];
                                            return (
                                                <Box key={param.id}>
                                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                                                        {param.name}{param.required ? ' *' : ''}
                                                    </Typography>
                                                    {values.map((val: any, idx: number) => (
                                                        <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                                            <TextField
                                                                size="small"
                                                                fullWidth
                                                                label={idx === 0 ? param.name : `${param.name} (${idx + 1})`}
                                                                value={val ?? ''}
                                                                onChange={(e) => {
                                                                    const next = [...values];
                                                                    next[idx] = e.target.value;
                                                                    updateDraftValue(param.id, next);
                                                                }}
                                                                error={idx === 0 && Boolean(err)}
                                                                helperText={idx === 0 ? (err ? err : (param.description ?? '')) : ''}
                                                            />
                                                            {idx > 0 && (
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => updateDraftValue(param.id, values.filter((_: any, i: number) => i !== idx))}
                                                                >
                                                                    <DeleteForeverSharp fontSize="small" />
                                                                </IconButton>
                                                            )}
                                                            {idx === 0 && (
                                                                <IconButton size="small" onClick={() => updateDraftValue(param.id, [...values, ''])}>
                                                                    <PlusOne fontSize="small" />
                                                                </IconButton>
                                                            )}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            );
                                        }

                                        return (
                                            <TextField
                                                key={param.id}
                                                size="small"
                                                fullWidth
                                                label={`${param.name}${param.required ? ' *' : ''}`}
                                                value={param.value ?? ''}
                                                onChange={(e) => updateDraftValue(param.id, e.target.value)}
                                                error={Boolean(err)}
                                                helperText={err ? err : (param.description ?? '')}
                                            />
                                        );
                                    })}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={closeAddService} disabled={addingWorkflow}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSaveAddedService}
                            disabled={!selectedService || addingWorkflow}
                        >
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={addServiceSnackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setAddServiceSnackbar((s) => ({ ...s, open: false }))}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert
                        onClose={() => setAddServiceSnackbar((s) => ({ ...s, open: false }))}
                        severity={addServiceSnackbar.severity}
                        variant="filled"
                        sx={{ width: '100%' }}
                    >
                        {addServiceSnackbar.message}
                    </Alert>
                </Snackbar>
            </div>
        </div>
    )
}

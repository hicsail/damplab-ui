import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { Box, Button, Card, CardContent, Typography, Alert, Chip, Link as MuiLink, List, ListItem, ListItemText, FormControl, InputLabel, MenuItem, Select, Divider, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { AccessTime, Publish, NotInterested, Check, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import PictureAsPdfIcon                               from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon                                from '@mui/icons-material/Description';

import { GET_INVOICES_BY_JOB_ID, GET_JOB_BY_ID, GET_SOW_BY_JOB_ID, GET_SOW_EDITOR_STATE }         from '../gql/queries';
import { CREATE_INVOICE, CREATE_SOW_FOR_JOB, MUTATE_JOB_STATE, CHANGE_JOB_CUSTOMER_CATEGORY, WITHDRAW_JOB_FROM_CUSTOMER, WITHDRAW_JOB_ACCEPTANCE }  from '../gql/mutations';
import JobWorkflowCards, { getParameterFiles as getJobParameterFiles } from '../components/JobWorkflowCards';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { diffJobGraphs, latestContentVersion, selectedDiffPair } from '../utils/jobGraphDiff';
import JobVersionHistory from '../components/JobVersionHistory';
import { versionWorkflowsAsCards } from '../controllers/jobGraphHydration';

import JobFeedbackModal           from '../components/JobFeedbackModal';
import { technicianCustomerActionCopy } from '../utils/jobEditing';
import { refreshReviewSurfaces } from '../utils/jobReview';
import JobPDFDocument             from '../components/JobPDFDocument';
import JobInvoiceDocument         from '../components/JobInvoiceDocument';
import SowEditorModal             from '../components/sow/SowEditorModal';
import SowStatusCard              from '../components/sow/SowStatusCard';
import ReasonDialog               from '../components/ReasonDialog';
import { CommentsSection }        from '../components/CommentsSection';
import { UserContext }            from '../contexts/UserContext';
import { AppContext }             from '../contexts/App';
import { CUSTOMER_CATEGORY_OPTIONS } from '../components/sow/sowTypes';

const stripTypename = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stripTypename);
    if (!value || typeof value !== 'object') return value;
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
        if (k === '__typename') return;
        out[k] = stripTypename(v);
    });
    return out;
};

const downloadJson = (filename: string, payload: unknown) => {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Let the browser start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 0);
};

export default function TechnicianView() {

    const { id }                              = useParams();
    const navigate                            = useNavigate();
    const apolloClient                        = useApolloClient();
    const userContext                         = useContext(UserContext);
    // The catalogue, for re-attaching parameter definitions to a version snapshot.
    const { services }                        = useContext(AppContext);

    const [workflowName, setWorkflowName]     = useState('');
    const [workflowState, setWorkflowState]   = useState('');
    const [jobName, setJobName]               = useState('');
    const [jobState, setJobState]             = useState('');
    const [jobTime, setJobTime]               = useState('');
    const [jobUsername, setJobUsername]       = useState('');
    const [jobInstitution, setJobInstitution] = useState('');
    const [jobEmail, setJobEmail]             = useState('');
    const [jobNotes, setJobNotes] = useState('');
    const [workflows, setWorklows]            = useState<any[]>([]);
    // Which version of the graph is on screen, and what it is compared against.
    // Viewing starts unset and snaps to latest once versions load, matching
    // the job editor so Compare-to is a live controlled value on first paint.
    const [viewingVersion, setViewingVersion] = useState<number | null>(null);
    const [baselineVersionNumber, setBaselineVersionNumber] = useState<number | null | undefined>(undefined);
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
        const latest = latestContentVersion((job as any)?.versions ?? []);
        if (latest) setViewingVersion((prev) => prev ?? latest.versionNumber);
    }, [data?.jobById]);

    const { data: sowByJobIdResult, loading: sowLoading, refetch: refetchSow } = useQuery(GET_SOW_BY_JOB_ID, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'network-only',
    });

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

    const [createSowForJob] = useMutation(CREATE_SOW_FOR_JOB);
    const [creatingSow, setCreatingSow] = useState(false);
    const [sowCreateError, setSowCreateError] = useState<string | null>(null);

    const [changeJobCustomerCategory, { loading: categoryUpdating }] = useMutation(CHANGE_JOB_CUSTOMER_CATEGORY);
    const [changeJobStateMutation, { loading: closingJob }] = useMutation(MUTATE_JOB_STATE);
    const [withdrawFromCustomer] = useMutation(WITHDRAW_JOB_FROM_CUSTOMER);
    const [withdrawAcceptance] = useMutation(WITHDRAW_JOB_ACCEPTANCE);
    const [withdrawing, setWithdrawing] = useState(false);

    /**
     * Taking a job back so the lab can edit it again.
     *
     * Two shapes of the same intent. Both undo something the client can see, so
     * both state what is lost and require a reason — which is posted to the
     * client, and is the only account they get of why their job moved.
     */
    const [withdrawKind, setWithdrawKind] = useState<'customer' | 'acceptance' | null>(null);

    const withdrawCopy = {
        customer: {
            title: 'Withdraw this job from the client?',
            warning:
                'The workflow will be restored to the version the client was sent.\n\nEdits they saved but did not submit stay in the job history, but will no longer be the current version — they will see the workflow revert.',
            confirmLabel: 'Withdraw from client'
        },
        acceptance: {
            title: 'Withdraw the acceptance on this job?',
            warning:
                'The spec stops being agreed, so its Statement of Work cannot be sent or signed until you accept the job again.\n\nThe document itself is left alone — cancel it separately if it is not going ahead.',
            confirmLabel: 'Withdraw acceptance'
        }
    } as const;

    const handleWithdraw = async (reason: string) => {
        if (!id || !withdrawKind) return;
        setWithdrawing(true);
        try {
            const input = { operationId: crypto.randomUUID(), jobId: id, reason };
            if (withdrawKind === 'customer') await withdrawFromCustomer({ variables: { input } });
            else await withdrawAcceptance({ variables: { input } });
            await handleReviewSubmitted();
            setWithdrawKind(null);
        } catch (e: any) {
            window.alert(e?.message ?? 'Could not withdraw the job.');
        } finally {
            setWithdrawing(false);
        }
    };

    const handleCloseJob = async () => {
        if (!id) return;
        const ok = window.confirm(
            'Close this job? It will be marked CLOSED and removed from the lab monitor. This action is meant for jobs that are fully wrapped up.'
        );
        if (!ok) return;
        try {
            await changeJobStateMutation({ variables: { ID: id, State: 'CLOSED' } });
            await refetchJob();
        } catch (e) {
            console.error('Failed to close job:', e);
            window.alert('Could not close the job. Please try again.');
        }
    };

    const [createInvoice, { loading: creatingInvoice }] = useMutation(CREATE_INVOICE);

    const [modalOpen, setModalOpen] = useState(false);
    const [sowModalOpen, setSowModalOpen] = useState(false);

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleReviewSubmitted = () =>
        refreshReviewSurfaces({
            refetchJob,
            refetchSow,
            refetchSowEditorState: () => apolloClient.refetchQueries({ include: [GET_SOW_EDITOR_STATE] })
        });

    /**
     * "Generate SOW" on a job that has none creates it first, then opens the
     * editor on it — the editor edits an existing document and has nothing to
     * show until one exists. The mutation returns the existing SOW when there
     * already is one, so a double click is harmless.
     */
    const handleOpenSOWModal = async () => {
        if (!id) return;
        if (sowData) {
            setSowModalOpen(true);
            return;
        }

        setSowCreateError(null);
        setCreatingSow(true);
        try {
            await createSowForJob({
                variables: { jobId: id },
                refetchQueries: [
                    { query: GET_JOB_BY_ID, variables: { id } },
                    { query: GET_SOW_BY_JOB_ID, variables: { jobId: id } }
                ],
                awaitRefetchQueries: true
            });
            setSowModalOpen(true);
        } catch (error: any) {
            setSowCreateError(error?.message ?? 'Could not generate the Statement of Work.');
        } finally {
            setCreatingSow(false);
        }
    };

    const handleCloseSOWModal = () => {
        setSowModalOpen(false);
    };

    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [selectedInvoiceServiceIds, setSelectedInvoiceServiceIds] = useState<string[]>([]);

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

    const getParameterFiles = () => getJobParameterFiles(workflows);

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
        const closedText = "This job has been closed out. It is no longer active in the lab monitor.";
        const changesText = technicianCustomerActionCopy(jobData);
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
            case 'CLOSED':
                return ['rgba(120, 120, 120, 0.35)', <Check />, closedText];
            case 'CHANGES_REQUESTED':
                return ['rgba(255, 152, 0, 0.4)', <Publish />, changesText];
            default:
                return ['rgb(0, 0, 0, 0)', <NotInterested />, defaultText];
        }
    }
    const jobStatusColor = jobStatus()[0];
    const jobStatusIcon = jobStatus()[1];
    const jobStatusText = jobStatus()[2];

    const handleExportJobJson = () => {
        if (!id || !jobData) return;
        const exportPayload = stripTypename({
            exportedAt: new Date().toISOString(),
            job: jobData,
            sow: sowFullData,
            invoices,
        });
        const displayId = (jobData as any)?.jobId ?? id;
        downloadJson(`DAMP-Job-${displayId}.json`, exportPayload);
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

    // Highlight what changed since the last version written by the other side,
    // unless the reader has picked a different pair from the history.
    const versions = (jobData as any)?.versions ?? [];
    const { current: currentVersion, baseline: baselineVersion } = selectedDiffPair(versions, viewingVersion, baselineVersionNumber);
    const graphDiff = currentVersion && baselineVersion && currentVersion !== baselineVersion
        ? diffJobGraphs(baselineVersion.workflows, currentVersion.workflows)
        : undefined;

    // Paging back shows that version's own graph; the newest one is the live job.
    const latest = latestContentVersion(versions);
    const isHistoricVersion = latest != null && viewingVersion != null && viewingVersion !== latest.versionNumber;
    const cardWorkflows = isHistoricVersion ? versionWorkflowsAsCards(currentVersion?.workflows, services ?? []) : workflows;

    const workflowCard = (
        <>
            {versions.length > 1 && (
                <Box sx={{ mb: 1.5 }}>
                    <JobVersionHistory
                        versions={versions}
                        viewing={viewingVersion ?? latest?.versionNumber ?? 0}
                        baseline={baselineVersion?.versionNumber ?? null}
                        onViewingChange={(v) => {
                            setViewingVersion(v);
                            setBaselineVersionNumber(undefined);
                        }}
                        onBaselineChange={setBaselineVersionNumber}
                    />
                </Box>
            )}
            <JobWorkflowCards
                workflows={cardWorkflows}
                fallbackName={workflowName}
                diff={graphDiff}
                currentVersion={currentVersion}
                baselineVersion={baselineVersion}
            />
        </>
    );

    const currentCustomerCategory = jobData?.customerCategory ?? 'EXTERNAL_CUSTOMER_MARKET';

    const handleCustomerCategoryChange = async (nextCategory: string) => {
        if (!id) return;
        try {
            await changeJobCustomerCategory({
                variables: { jobId: id as string, customerCategory: nextCategory },
            });
            await Promise.all([
                refetchJob(),
                refetchSow(),
                apolloClient.refetchQueries({ include: [GET_SOW_EDITOR_STATE] }),
            ]);
        } catch (e) {
            console.error('Failed to update job customer category:', e);
        }
    };

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
                    <FormControl size="small" sx={{ minWidth: 260 }} disabled={categoryUpdating || !jobData}>
                        <InputLabel id="pricing-category-label">Pricing category</InputLabel>
                        <Select
                            labelId="pricing-category-label"
                            value={currentCustomerCategory}
                            label="Pricing category"
                            onChange={(e) => handleCustomerCategoryChange(String(e.target.value))}
                        >
                            {CUSTOMER_CATEGORY_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200 }}>
                        Updates this customer&apos;s category globally (signed SOWs remain static snapshots).
                    </Typography>
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
                        disabled={!jobData || creatingSow}
                        sx={{ mr: 1 }}
                    >
                        {creatingSow ? 'Generating…' : sowData ? 'Edit SOW' : 'Generate SOW'}
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
                        startIcon={<AccountTreeIcon sx={{ transform: 'rotate(90deg) scaleY(-1)' }} />}
                        onClick={() => navigate(`/job_editor/${id}`)}
                        disabled={jobState === 'CLOSED'}
                        sx={{ textTransform: 'none' }}
                    >
                        Edit Job
                    </Button>
                    {/* Reachable after acceptance too, not just at intake: it is
                        where staff re-accept a job whose spec has changed (which
                        releases the SOW send) and, equally, where they can hand it
                        back to the customer instead. */}
                    <Button 
                        variant="contained"
                        color="error"
                        onClick={handleOpenModal}
                        disabled={!['SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED'].includes(jobState ?? '')}
                    >
                        Review Job
                    </Button>
                    {/* Editing is exclusive now: to change a job the customer holds,
                        or one whose spec is agreed, staff take it back first. */}
                    {jobState === 'CHANGES_REQUESTED' && (
                        <Button variant="outlined" color="warning" onClick={() => setWithdrawKind('customer')} disabled={withdrawing} sx={{ textTransform: 'none' }}>
                            {withdrawing ? 'Withdrawing…' : 'Withdraw from customer'}
                        </Button>
                    )}
                    {jobState === 'ACCEPTED' && (
                        <Button variant="outlined" color="warning" onClick={() => setWithdrawKind('acceptance')} disabled={withdrawing} sx={{ textTransform: 'none' }}>
                            {withdrawing ? 'Withdrawing…' : 'Withdraw acceptance'}
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        onClick={handleExportJobJson}
                        disabled={!jobData}
                        sx={{ textTransform: 'none' }}
                    >
                        Export job JSON
                    </Button>
                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={handleCloseJob}
                        disabled={!jobData || jobState === 'CLOSED' || closingJob}
                        sx={{ textTransform: 'none' }}
                    >
                        {jobState === 'CLOSED' ? 'Job closed' : closingJob ? 'Closing…' : 'Close job'}
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

                {sowCreateError && (
                    <Box sx={{ mx: 3, my: 2 }}>
                        <Alert severity="error" onClose={() => setSowCreateError(null)}>
                            {sowCreateError}
                        </Alert>
                    </Box>
                )}

                {/* SOW Status Indicator */}
                {sowData && (
                    <SowStatusCard jobId={id || ''} onOpenEditor={handleOpenSOWModal} />
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
                        email: userContext.userProps?.idTokenParsed?.email ?? 'technician@bu.edu',
                        isStaff: true
                    }}
                />

                {withdrawKind && (
                    <ReasonDialog
                        open
                        title={withdrawCopy[withdrawKind].title}
                        warning={withdrawCopy[withdrawKind].warning}
                        confirmLabel={withdrawCopy[withdrawKind].confirmLabel}
                        busy={withdrawing}
                        onCancel={() => setWithdrawKind(null)}
                        onConfirm={handleWithdraw}
                    />
                )}
                <JobFeedbackModal
                    open={modalOpen}
                    onClose={handleCloseModal}
                    onSubmitted={handleReviewSubmitted}
                    id={id}
                    jobName={jobName}
                    jobUsername={jobUsername}
                    jobEmail={jobEmail}
                    jobInstitution={jobInstitution}
                    jobTime={jobTime}
                    jobState={jobState}
                />
                <SowEditorModal
                    open={sowModalOpen}
                    onClose={handleCloseSOWModal}
                    jobId={id ?? ''}
                    jobName={jobData?.name}
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
            </div>
        </div>
    )
}

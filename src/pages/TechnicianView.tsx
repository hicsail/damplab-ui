import React, { useContext, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  useQuery,
  useMutation,
  useApolloClient,
  useLazyQuery,
} from "@apollo/client";
import { PDFDownloadLink } from "@react-pdf/renderer";

import {
  Box,
  Button,
  Chip,
  Tooltip,
  Typography,
  Alert,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import RateReviewIcon from "@mui/icons-material/RateReview";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { invoiceBlockedMessage } from "../utils/invoiceGate";
import UndoIcon from "@mui/icons-material/Undo";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import HistoryIcon from "@mui/icons-material/History";

import {
  GET_INVOICES_BY_JOB_ID,
  GET_JOB_BY_ID,
  GET_SOW_BY_JOB_ID,
  GET_SOW_EDITOR_STATE,
  GET_JOB_EQUIPMENT_BOOKING,
  GET_INVENTORY_AVAILABILITY,
  GET_JOB_BALANCE,
  GET_JOB_CHARGES,
  GET_JOB_PAYMENTS,
} from "../gql/queries";
import {
  JobSubmitterSummary,
  summarizeJobSubmitter,
} from "../utils/jobSubmitter";
import {
  CREATE_SOW_FOR_JOB,
  MUTATE_JOB_STATE,
  RERUN_JOB_HOMOLOGY_SCREENING,
  START_JOB_CUSTOMER_VERIFICATION,
  WITHDRAW_JOB_FROM_CUSTOMER,
  WITHDRAW_JOB_ACCEPTANCE,
  RESTORE_JOB_VERSION,
} from "../gql/mutations";
import JobWorkflowCards, {
  getParameterFiles as getJobParameterFiles,
  getSampleSheets,
  overlayLiveSampleSheets,
} from "../components/JobWorkflowCards";
import SampleSheetSection from "../components/SampleSheetSection";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import {
  diffJobGraphs,
  hasUnseenStaffEdits,
  jobVersionDisplayLabel,
  latestVersion,
  selectedDiffPair,
} from "../utils/jobGraphDiff";
import JobVersionHistory from "../components/JobVersionHistory";
import { versionWorkflowsAsCards } from "../controllers/jobGraphHydration";

import JobFeedbackModal from "../components/JobFeedbackModal";
import {
  canRevertVersions,
  technicianCustomerActionCopy,
} from "../utils/jobEditing";
import JobPDFDocument from "../components/JobPDFDocument";
import SowEditorModal from "../components/sow/SowEditorModal";
import {
  SowPdfDownloadButton,
  SowStatusDetails,
  SowStatusSummary,
  useSowStaffStatus,
} from "../components/sow/SowStatusCard";
import ProcessCard from "../components/technician/ProcessCard";
import JobEquipmentBookingPanel from "../components/booking/JobEquipmentBookingPanel";
import JobPaymentsPanel from "../components/billing/JobPaymentsPanel";
import InvoicePanel from "../components/billing/InvoicePanel";
import ReasonDialog from "../components/ReasonDialog";
import Can from "../components/PermissionGate";
import { PERMISSIONS } from "../hooks/usePermissions";
import { CommentsSection } from "../components/CommentsSection";
import JobActivityTimeline, {
  TimelineSection,
} from "../components/JobActivityTimeline";
import { UserContext } from "../contexts/UserContext";
import { AppContext } from "../contexts/App";
import { statusColor } from "../components/sow/sowTypes";
import { formatGqlError } from "../utils/gqlError";
import {
  chipStatusBackground,
  isJobProcessSettled,
  isSowProcessSettled,
  jobPartyStatus,
  jobStatusColor,
  jobStatusLabel,
  latestCustomerVisibleJobVersion,
  latestCustomerVisibleSowVersion,
  latestStaffVisibleJobVersion,
  latestStaffVisibleSowVersion,
  partyVersionLabel,
  sowPartyStatus,
  sowPartyVersionLabel,
} from "../utils/technicianProcessStatus";
import StatusPaneHeader from "../components/technician/StatusPaneHeader";
import {
  BIOSECURITY_SCREENINGS,
  biosecurityFromJob,
  biosecurityStatusColor,
  biosecurityStatusLabel,
  compositeBiosecurityStatus,
  customerDetail,
  staffHomologyNote,
} from "../components/technician/biosecurityStatus";
import BiosecurityScreeningSections, {
  BiosecurityStatusIcon,
} from "../components/technician/BiosecurityScreeningSections";
// Hosted-page opener only. The embed loader is deliberately not imported here:
// staff must never run the customer's identity verification as themselves.
import { openHostedVerification } from "../aclid/verificationWidget";
import ScreeningBatchDetailsModal from "../components/ScreeningBatchDetailsModal";
import { GET_SCREENING_BATCH } from "../securedna/SequencesQueries";
import type { ScreeningBatch } from "../securedna/types";

const stripTypename = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripTypename);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
    if (k === "__typename") return;
    out[k] = stripTypename(v);
  });
  return out;
};

const downloadJson = (filename: string, payload: unknown) => {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Let the browser start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/** The one label for every control that copies the customer's verification link. */
const COPY_VERIFICATION_LINK = "Copy verification link";

export default function TechnicianView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const userContext = useContext(UserContext);
  // The catalogue, for re-attaching parameter definitions to a version snapshot.
  const { services } = useContext(AppContext);

  const [workflowName, setWorkflowName] = useState("");
  const [workflowState, setWorkflowState] = useState("");
  const [jobName, setJobName] = useState("");
  const [jobState, setJobState] = useState("");
  const [jobTime, setJobTime] = useState("");
  const [submitter, setSubmitter] = useState<JobSubmitterSummary>({
    user: "",
    onBehalfOf: null,
    organization: "",
  });
  // Kept as their own slots because the job PDF and the feedback modal take them
  // as separate props; the header reads `submitter` instead.
  const [jobUsername, setJobUsername] = useState("");
  const [jobInstitution, setJobInstitution] = useState("");
  const [jobEmail, setJobEmail] = useState("");
  const [jobNotes, setJobNotes] = useState("");
  const [workflows, setWorklows] = useState<any[]>([]);
  // Which version of the graph is on screen, and what it is compared against.
  // Viewing starts unset and snaps to latest once versions load, matching
  // the job editor so Compare-to is a live controlled value on first paint.
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [baselineVersionNumber, setBaselineVersionNumber] = useState<
    number | null | undefined
  >(undefined);
  const [attachments, setAttachments] = useState<any[]>([]);

  const {
    loading,
    error,
    data,
    refetch: refetchJob,
  } = useQuery(GET_JOB_BY_ID, {
    variables: { id: id },
    skip: !id,
    fetchPolicy: "network-only",
    onError: (error: any) => {
      // Error handled by error state
    },
  });

  // Keep local UI in sync on every fetch/refetch (onCompleted alone does not always run on refetch).
  useEffect(() => {
    const job = data?.jobById;
    if (!job) return;
    setJobName(job.name ?? "");
    setJobState(job.state ?? "");
    setJobTime(job.submitted ?? "");
    setSubmitter(summarizeJobSubmitter(job));
    setJobUsername(job.clientDisplayName || job.username || "");
    setJobInstitution(job.institute ?? "");
    setJobEmail(job.email ?? "");
    setJobNotes(job.notes ?? "");
    setWorklows(job.workflows ?? []);
    setAttachments(job.attachments ?? []);
    const wfs = job.workflows ?? [];
    if (wfs.length > 0) {
      setWorkflowName(wfs[0].name ?? "");
      setWorkflowState(wfs[0].state ?? "");
    }
    // Land on the newest version, with its default comparison, every time the
    // job reloads. This was `prev ?? latest`, which pinned the view to
    // whatever was newest on first load: acting on the job and refreshing
    // left the reader still looking at a superseded version, and a baseline
    // they had picked by hand stayed selected against it.
    //
    // Safe to reset unconditionally because nothing polls this query — the
    // data only changes when the reader refreshes or acts on the job, and in
    // both cases the newest version is what they are asking to see.
    //
    // The newest *row*, not the newest edit: this was `latestContentVersion`,
    // which skips state-change events, so a job whose last row is "Accepted"
    // (5.3) reopened on the draft below it (5.1) and reported the job as still
    // being drafted. Accepting is the thing the reader most wants to see, and
    // the automatic baseline still skips events, so the diff below is
    // unaffected — it resolves to the last version written by the other side.
    const latest = latestVersion((job as any)?.versions ?? []);
    if (latest) {
      setViewingVersion(latest.versionNumber);
      setBaselineVersionNumber(undefined);
    }
  }, [data?.jobById]);

  const {
    data: sowByJobIdResult,
    loading: sowLoading,
    refetch: refetchSow,
  } = useQuery(GET_SOW_BY_JOB_ID, {
    variables: { jobId: id as string },
    skip: !id,
    fetchPolicy: "network-only",
  });

  const {
    data: invoicesResult,
    loading: invoicesLoading,
    refetch: refetchInvoices,
  } = useQuery(GET_INVOICES_BY_JOB_ID, {
    variables: { jobId: id as string },
    skip: !id,
    fetchPolicy: "network-only",
  });
  const invoices = invoicesResult?.invoicesByJobId ?? [];

  const sowStatus = useSowStaffStatus(id || "");

  // Derive from Apollo cache so refetches (e.g. after SOW upsert) update without a full page reload.
  const jobData = data?.jobById ?? null;
  const sowData = jobData?.sow ?? null;
  const sowFullData = sowByJobIdResult?.sowByJobId ?? null;

  const [createSowForJob] = useMutation(CREATE_SOW_FOR_JOB);
  const [creatingSow, setCreatingSow] = useState(false);
  const [sowCreateError, setSowCreateError] = useState<string | null>(null);

  const [changeJobStateMutation, { loading: closingJob }] =
    useMutation(MUTATE_JOB_STATE);
  const [rerunJobHomologyScreening, { loading: rerunningScreening }] =
    useMutation(RERUN_JOB_HOMOLOGY_SCREENING);
  const [
    loadScreeningBatch,
    {
      data: screeningBatchData,
      loading: screeningBatchLoading,
      error: screeningBatchError,
    },
  ] = useLazyQuery<{ screeningBatch: ScreeningBatch | null }>(
    GET_SCREENING_BATCH,
    {
      fetchPolicy: "network-only",
    },
  );
  const [homologyModalOpen, setHomologyModalOpen] = useState(false);
  // Mints the customer's hosted verification URL. Staff only ever copy it or
  // open the hosted page for a customer on a call — never the embed.
  const [startJobCustomerVerification, { loading: mintingVerificationLink }] =
    useMutation(START_JOB_CUSTOMER_VERIFICATION);
  const [withdrawFromCustomer] = useMutation(WITHDRAW_JOB_FROM_CUSTOMER);
  const [withdrawAcceptance] = useMutation(WITHDRAW_JOB_ACCEPTANCE);
  const [restoreJobVersion] = useMutation(RESTORE_JOB_VERSION);
  const [restoringVersion, setRestoringVersion] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  /**
   * Taking a job back so the lab can edit it again.
   *
   * Two shapes of the same intent. Both undo something the client can see, so
   * both state what is lost and require a reason — which is posted to the
   * client, and is the only account they get of why their job moved.
   */
  const [withdrawKind, setWithdrawKind] = useState<
    "customer" | "acceptance" | null
  >(null);

  const withdrawCopy = {
    customer: {
      title: "Withdraw this job from the client?",
      warning:
        "The workflow will be restored to the version the client was sent.\n\nEdits they saved but did not submit stay in the job history, but will no longer be the current version — they will see the workflow revert.",
      confirmLabel: "Withdraw from client",
    },
    acceptance: {
      title: "Withdraw the acceptance on this job?",
      warning:
        "The spec stops being agreed, so its Statement of Work cannot be sent or signed until you accept the job again.\n\nThe document itself is left alone — cancel it separately if it is not going ahead.",
      confirmLabel: "Withdraw acceptance",
    },
  } as const;

  const handleWithdraw = async (reason: string) => {
    if (!id || !withdrawKind) return;
    setWithdrawing(true);
    try {
      const input = { operationId: crypto.randomUUID(), jobId: id, reason };
      if (withdrawKind === "customer")
        await withdrawFromCustomer({ variables: { input } });
      else await withdrawAcceptance({ variables: { input } });
      await handleReviewSubmitted();
      setWithdrawKind(null);
    } catch (e: any) {
      window.alert(e?.message ?? "Could not withdraw the job.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleCloseJob = async () => {
    if (!id) return;
    const ok = window.confirm(
      "Close this job? It will be marked CLOSED and removed from the lab monitor. This action is meant for jobs that are fully wrapped up.",
    );
    if (!ok) return;
    try {
      await changeJobStateMutation({ variables: { ID: id, State: "CLOSED" } });
      await refreshJobPage();
    } catch (e) {
      console.error("Failed to close job:", e);
      window.alert("Could not close the job. Please try again.");
    }
  };

  /**
   * Restore the version currently being viewed.
   *
   * Server-side, like the editor's copy: withdrawing a job from the customer
   * restores the same way, and the gate deciding who may write lives there.
   * No picker bookkeeping afterwards — the effect on `data.jobById` already
   * snaps the view to the newest row on every refetch.
   */
  const handleRestoreVersion = async () => {
    if (!id || viewingVersion == null) return;
    const label = jobVersionDisplayLabel(viewingVersion);
    if (
      !window.confirm(
        `Restore version ${label}? This becomes the current workflow, saved as a new version. Nothing already in the history is lost.`,
      )
    )
      return;
    setRestoringVersion(true);
    try {
      await restoreJobVersion({
        variables: {
          jobId: id,
          versionNumber: viewingVersion,
          note: `Restored version ${label}`,
        },
      });
      await refreshJobPage();
    } catch (e: any) {
      window.alert(e?.message ?? "Could not restore that version.");
    } finally {
      setRestoringVersion(false);
    }
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [sowModalOpen, setSowModalOpen] = useState(false);

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const [refreshing, setRefreshing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const jobSectionRef = useRef<HTMLDivElement>(null);
  const sowSectionRef = useRef<HTMLDivElement>(null);
  const invoiceSectionRef = useRef<HTMLDivElement>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const handleTimelineNavigate = (section: TimelineSection) => {
    const refs: Record<
      TimelineSection,
      React.RefObject<HTMLDivElement | null>
    > = {
      job: jobSectionRef,
      sow: sowSectionRef,
      invoice: invoiceSectionRef,
      comments: commentsSectionRef,
    };
    refs[section]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const refreshJobPage = async () => {
    await Promise.all([
      refetchJob(),
      refetchSow(),
      refetchInvoices(),
      apolloClient.refetchQueries({
        include: [
          GET_SOW_EDITOR_STATE,
          GET_JOB_EQUIPMENT_BOOKING,
          GET_INVENTORY_AVAILABILITY,
          GET_JOB_BALANCE,
          GET_JOB_CHARGES,
          GET_JOB_PAYMENTS,
        ],
      }),
    ]);
  };

  const handleRerunHomologyScreening = async () => {
    if (!id) return;
    try {
      await rerunJobHomologyScreening({ variables: { jobId: id } });
      await refetchJob();
    } catch (e) {
      window.alert(formatGqlError(e, "Could not run homology screening."));
    }
  };

  const handleHomologyDetails = () => {
    const batchId = jobData?.homologyScreening?.batchId;
    if (!batchId) return;
    setHomologyModalOpen(true);
    void loadScreeningBatch({ variables: { id: batchId } });
  };

  /**
   * A fresh hosted verification URL for this job's customer. Minted on every
   * click rather than cached: the server owns the link's lifetime, and a
   * stale one copied into an email is worse than a round trip.
   */
  const mintCustomerVerificationUrl = async (): Promise<string> => {
    if (!id) throw new Error("No job to verify.");
    const result = await startJobCustomerVerification({
      variables: { jobId: id },
    });
    const url: string | undefined =
      result.data?.startJobCustomerVerification?.url;
    if (!url) throw new Error("No verification link was returned.");
    return url;
  };

  /**
   * Copy the customer's verification link for staff to send on. The
   * clipboard is not always available (insecure origin, permission denied,
   * focus lost while the mutation ran), so the URL is shown for hand-copying
   * when the write fails rather than silently dropped.
   */
  const handleCopyVerificationLink = async () => {
    // Also reached from the status-pane icon and the details chip, which
    // stay enabled (a disabled Tooltip child is a MUI warning), so the
    // re-entry guard lives here rather than on each control.
    if (mintingVerificationLink) return;
    let url: string;
    try {
      url = await mintCustomerVerificationUrl();
    } catch (e) {
      window.alert(formatGqlError(e, "Could not create a verification link."));
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.alert(`Copy this verification link for the customer:\n\n${url}`);
    }
  };

  /**
   * Open the hosted verification page in a new tab, for staff walking a
   * customer through it on a call. Mint and open stay inside this click
   * handler so the `window.open` still counts as the user's gesture.
   */
  const handleOpenHostedVerification = async () => {
    if (mintingVerificationLink) return;
    try {
      const url = await mintCustomerVerificationUrl();
      // The mint is an await, so the open can land outside the gesture
      // window and be blocked. Fall back to showing the link.
      if (!openHostedVerification(url)) {
        window.alert(
          `Your browser blocked the new tab. Open this verification link for the customer:\n\n${url}`,
        );
      }
    } catch (e) {
      window.alert(formatGqlError(e, "Could not open hosted verification."));
    }
  };

  const handleReviewSubmitted = () => refreshJobPage();

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
          { query: GET_SOW_BY_JOB_ID, variables: { jobId: id } },
        ],
        awaitRefetchQueries: true,
      });
      setSowModalOpen(true);
    } catch (error: any) {
      setSowCreateError(
        error?.message ?? "Could not generate the Statement of Work.",
      );
    } finally {
      setCreatingSow(false);
    }
  };

  const handleCloseSOWModal = () => {
    setSowModalOpen(false);
    void refreshJobPage();
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

  // Copy only: the pane's colour comes from jobStatusColor(), the one table
  // shared with the Statement of Work.
  const jobStatusText = (() => {
    switch (jobState) {
      case "CREATING":
        return "The job is currently being created.";
      case "SUBMITTED":
        return "The job was submitted to the DAMP lab and is awaiting review.";
      case "CHANGES_REQUESTED":
        return technicianCustomerActionCopy(jobData);
      case "ACCEPTED":
        return "The job was accepted by the DAMP Lab. The client will be asked to sign and return the SOW.";
      case "WAITING_FOR_SOW":
        return "The job is waiting on its Statement of Work before lab work can start.";
      case "QUEUED":
        return "The job is queued for lab work.";
      case "IN_PROGRESS":
        return "Lab work on this job is under way.";
      case "COMPLETE":
        return "Lab work on this job is finished. It can be invoiced and closed out.";
      case "REJECTED":
        return "The job was rejected by the DAMP Lab. The client will be asked to resubmit the job with changes.";
      case "CLOSED":
        return "This job has been closed out. It is no longer active in the lab monitor.";
      case "CANCELLED":
        return "The client cancelled this job. Any Statement of Work was cancelled with it, and it is no longer active in the lab monitor.";
      default:
        return "This job's state is not recognised.";
    }
  })();

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
  const { current: currentVersion, baseline: baselineVersion } =
    selectedDiffPair(versions, viewingVersion, baselineVersionNumber);
  const graphDiff =
    currentVersion && baselineVersion && currentVersion !== baselineVersion
      ? diffJobGraphs(baselineVersion.workflows, currentVersion.workflows)
      : undefined;

  // Paging back shows that version's own graph; the newest one is the live job.
  //
  // Keyed off the same newest row the picker lands on. Keying it off the newest
  // *content* version instead would flip every accepted job to "historic" the
  // moment the default landed on its trailing event row, quietly swapping the
  // live graph for a snapshot that only happens to match it.
  const latest = latestVersion(versions);
  const isHistoricVersion =
    latest != null &&
    viewingVersion != null &&
    viewingVersion !== latest.versionNumber;

  // Whether accepting would bind the customer to edits they have never seen.
  // The three conditions this turns on are spelled out at hasUnseenStaffEdits.
  const customerHasNotSeenEdits = hasUnseenStaffEdits(versions);
  const cardWorkflows = isHistoricVersion
    ? overlayLiveSampleSheets(
        versionWorkflowsAsCards(currentVersion?.workflows, services ?? []),
        workflows,
      )
    : workflows;
  /** Presentation only; replaceSampleSheet re-checks the job's state server-side. */
  const canReplaceSampleSheets =
    !!jobData &&
    jobData.state !== "CLOSED" &&
    jobData.state !== "CANCELLED" &&
    jobData.state !== "REJECTED";

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
            onRestore={
              canRevertVersions(jobData, true)
                ? handleRestoreVersion
                : undefined
            }
            restoring={restoringVersion}
          />
        </Box>
      )}
      <JobWorkflowCards
        workflows={cardWorkflows}
        fallbackName={workflowName}
        diff={graphDiff}
        currentVersion={currentVersion}
        baselineVersion={baselineVersion}
        sampleSheets={{
          jobId: id || "",
          canEdit: canReplaceSampleSheets,
          onChanged: refreshJobPage,
        }}
      />
    </>
  );

  const jobParties = jobPartyStatus(jobState);
  const sowParties = sowPartyStatus({
    currentStatus: sowStatus.current?.status,
    activeStatus:
      sowStatus.active?.status ?? sowStatus.sow?.activeVersion?.status,
  });
  const jobCustomerVersion = partyVersionLabel(
    latestCustomerVisibleJobVersion(versions),
  );
  const jobStaffVersion = partyVersionLabel(
    latestStaffVisibleJobVersion(versions),
  );
  const sowCustomerVersion = sowPartyVersionLabel(
    latestCustomerVisibleSowVersion(sowStatus.sow?.versions ?? []),
  );
  const sowStaffVersion = sowPartyVersionLabel(
    latestStaffVisibleSowVersion(sowStatus.sow?.versions ?? []),
  );
  const sowStatusPaneColor = chipStatusBackground(
    sowStatus.sow
      ? statusColor(sowStatus.active?.status ?? sowStatus.current?.status)
      : "default",
  );
  // Why no invoice version can be issued yet, or null when one can. The server
  // refuses anything but a countersigned SOW; while that state is still loading
  // the button stays blocked rather than offered and then refused.
  const invoiceBlocked = invoiceBlockedMessage(
    sowFullData
      ? {
          activeStatus: sowStatus.active?.status ?? null,
          versions: sowStatus.sow?.versions ?? [],
        }
      : null,
  );
  const issueBlockedReason =
    sowLoading || sowStatus.loading
      ? "Checking the Statement of Work…"
      : invoiceBlocked;
  const jobStatusPaneColor = chipStatusBackground(
    jobData ? jobStatusColor(jobState) : "default",
  );
  // Homology and Customer are the screenings with something behind them:
  // SecureDNA and Aclid run on submission and the job carries their verdicts.
  // The other three are placeholders.
  const aclid = jobData?.aclidScreening ?? null;
  const biosecurity = biosecurityFromJob(jobData);
  const biosecurityComposite = compositeBiosecurityStatus(biosecurity);
  // Homology's line names the provider that answered: SecureDNA's summary,
  // Aclid's regulatory verdict when it screened, and the SecureDNA-backup
  // sentence when Aclid did not answer. `homologyBackup` is that last
  // sentence alone, for the pane.
  const { note: homologyNote, backup: homologyBackup } = staffHomologyNote(
    jobData?.homologyScreening,
    aclid,
  );
  const customerNote = customerDetail(aclid);
  const homologyBatchId = jobData?.homologyScreening?.batchId as
    string | undefined;
  const homologyDetailsAvailable = Boolean(homologyBatchId);
  // The pane's one line explains the rollup, so homology's note belongs there
  // only when homology is what the rollup is reporting. Otherwise it would
  // read as an explanation of a status it has nothing to do with — "In
  // Progress ... 1 sequence cleared by SecureDNA". The one exception is a
  // SecureDNA backup: that Aclid did not answer is worth a line on the pane
  // whatever the rollup says. The details always carry the full note.
  const paneNote =
    biosecurityComposite === biosecurity.HOMOLOGY
      ? homologyNote
      : homologyBackup;
  const homologyBusy =
    biosecurity.HOMOLOGY === "IN_PROGRESS" || rerunningScreening;
  // Staff can hand the customer their verification link while Aclid has a
  // screen for this job and has not passed them. Copying is the action; the
  // embed is the customer's to run on their own page.
  const customerLinkAvailable =
    Boolean(aclid?.screenId) && biosecurity.CUSTOMER !== "PASSED";
  const railBtnSx = {
    textTransform: "none" as const,
    width: "100%",
    justifyContent: "flex-start",
    whiteSpace: "nowrap" as const,
  };

  return (
    <div>
      <div style={{ textAlign: "left", padding: "5vh" }}>
        {/* The job's name, the submission line, and the commands that act
                    on it. Kept sticky, offset below the fixed black header and the
                    breadcrumb bar (both publish their heights as CSS vars — see
                    HeaderBar and AppBreadcrumbs) so this stays visible on scroll
                    instead of getting buried under a long job. */}
        <Box
          sx={{
            position: "sticky",
            top: "calc(var(--app-header-height, 64px) + var(--app-breadcrumb-height, 41px))",
            zIndex: 1050,
            bgcolor: "background.paper",
            pt: 1,
            pb: 1.5,
            mb: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
              mb: 1,
            }}
          >
            <Typography variant="h5" fontWeight="bold">
              {jobName}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={async () => {
                setRefreshing(true);
                try {
                  await refreshJobPage();
                } finally {
                  setRefreshing(false);
                }
              }}
              disabled={!id || refreshing}
              sx={{ textTransform: "none" }}
            >
              {refreshing ? "Refreshing…" : "Refresh Job"}
            </Button>
            <Button
              variant="outlined"
              onClick={handleExportJobJson}
              disabled={!jobData}
              sx={{ textTransform: "none" }}
            >
              Export job JSON
            </Button>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => setHistoryOpen(true)}
              disabled={!id}
              sx={{ textTransform: "none" }}
            >
              History
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleCloseJob}
              disabled={
                !jobData ||
                jobState === "CLOSED" ||
                jobState === "CANCELLED" ||
                closingJob
              }
              sx={{ textTransform: "none" }}
            >
              {jobState === "CLOSED"
                ? "Job closed"
                : closingJob
                  ? "Closing…"
                  : "Close job"}
            </Button>
          </Box>
          <Typography sx={{ fontSize: 13 }}>
            {submitter.user}
            {submitter.organization && `, ${submitter.organization}`}
            {" submitted this job on "}
            {jobTime.slice(0, 16).replace("T", " ")}
          </Typography>
          {submitter.onBehalfOf && (
            <Typography sx={{ fontSize: 13, mt: 0.5 }}>
              {submitter.onBehalfOf}
            </Typography>
          )}
        </Box>

        {sowCreateError && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="error" onClose={() => setSowCreateError(null)}>
              {sowCreateError}
            </Alert>
          </Box>
        )}

        <div ref={jobSectionRef}>
          <ProcessCard
            title="Job"
            defaultExpanded={!isJobProcessSettled(jobState)}
            customerBadge={jobParties.customer}
            staffBadge={jobParties.staff}
            customerVersion={jobCustomerVersion}
            staffVersion={jobStaffVersion}
            statusPaneSx={{ bgcolor: jobStatusPaneColor }}
            statusPane={
              jobData ? (
                <StatusPaneHeader
                  status={jobStatusLabel(jobState)}
                  chips={
                    // partyVersionLabel returns '—' when the customer has seen
                    // nothing yet; a chip reading "—" is worse than no chip.
                    jobCustomerVersion === "—" ? undefined : (
                      <Chip
                        size="small"
                        label={jobCustomerVersion}
                        color={jobStatusColor(jobState)}
                      />
                    )
                  }
                  reference={
                    <>
                      <b>Job ID:</b> {jobData?.jobId ?? id}
                    </>
                  }
                  description={jobStatusText}
                />
              ) : (
                <StatusPaneHeader
                  status="Job not loaded"
                  description="This job could not be loaded. Check the ID or try again."
                />
              )
            }
            actions={
              <>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={
                    <AccountTreeIcon
                      sx={{ transform: "rotate(90deg) scaleY(-1)" }}
                    />
                  }
                  onClick={() => navigate(`/job_editor/${id}`)}
                  disabled={jobState === "CLOSED" || jobState === "CANCELLED"}
                  sx={railBtnSx}
                >
                  View/Edit Job
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="error"
                  startIcon={<RateReviewIcon />}
                  onClick={handleOpenModal}
                  disabled={
                    !["SUBMITTED", "CHANGES_REQUESTED", "ACCEPTED"].includes(
                      jobState ?? "",
                    )
                  }
                  sx={railBtnSx}
                >
                  Review Job
                </Button>
                {/* The client asked for the editor. Granting it is an
                                ordinary review decision (Request edits), so this
                                only says a request is outstanding — it is cleared
                                by the next decision, whatever that decision is. */}
                {jobData?.editAccessRequestedAt && (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    icon={<EditNoteIcon />}
                    label="Client requested edit access"
                    sx={{ alignSelf: "stretch" }}
                  />
                )}
                {jobState === "CHANGES_REQUESTED" && (
                  <Button
                    variant="contained"
                    size="small"
                    color="warning"
                    startIcon={<UndoIcon />}
                    onClick={() => setWithdrawKind("customer")}
                    disabled={withdrawing}
                    sx={railBtnSx}
                  >
                    {withdrawing ? "Withdrawing…" : "Withdraw from customer"}
                  </Button>
                )}
                {jobState === "ACCEPTED" && (
                  <Button
                    variant="contained"
                    size="small"
                    color="warning"
                    startIcon={<UndoIcon />}
                    onClick={() => setWithdrawKind("acceptance")}
                    disabled={withdrawing}
                    sx={railBtnSx}
                  >
                    {withdrawing ? "Withdrawing…" : "Withdraw acceptance"}
                  </Button>
                )}
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
                    style={{ textDecoration: "none", width: "100%" }}
                  >
                    {({ loading }) => (
                      <Button
                        color="primary"
                        size="small"
                        variant="outlined"
                        startIcon={<PictureAsPdfIcon />}
                        sx={railBtnSx}
                      >
                        {loading ? "Loading document..." : "Download Summary"}
                      </Button>
                    )}
                  </PDFDownloadLink>
                ) : (
                  <Button
                    color="primary"
                    size="small"
                    variant="outlined"
                    startIcon={<PictureAsPdfIcon />}
                    disabled
                    sx={railBtnSx}
                  >
                    Download Summary
                  </Button>
                )}
              </>
            }
            details={
              <>
                {attachments.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Attachments
                    </Typography>
                    <List dense>
                      {attachments.map((att, idx) => (
                        <ListItem key={`${att.filename}-${idx}`} sx={{ pl: 0 }}>
                          <ListItemText
                            primary={
                              att.url ? (
                                <MuiLink
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
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
                <SampleSheetSection
                  jobId={id || ""}
                  slots={getSampleSheets(workflows)}
                  canEdit={canReplaceSampleSheets}
                  onChanged={refreshJobPage}
                />
                {getParameterFiles().length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Parameter Files
                    </Typography>
                    <List dense>
                      {getParameterFiles().map((f, idx) => (
                        <ListItem
                          key={`${f.label}-${f.filename}-${idx}`}
                          sx={{ pl: 0 }}
                        >
                          <ListItemText
                            primary={
                              f.url ? (
                                <MuiLink
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
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
                {attachments.length === 0 &&
                  getParameterFiles().length === 0 &&
                  cardWorkflows.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No workflow details to show yet.
                    </Typography>
                  )}
                {workflowCard}
              </>
            }
          />
        </div>

        <ProcessCard
          title="Biosecurity"
          customerBadge={null}
          staffBadge={null}
          customerVersion="—"
          staffVersion="—"
          statusPaneSx={{
            bgcolor: chipStatusBackground(
              biosecurityStatusColor(biosecurityComposite),
            ),
          }}
          statusPane={
            <StatusPaneHeader
              status={biosecurityStatusLabel(biosecurityComposite)}
              description={
                paneNote ?? "Rolled up from primary and additional screening."
              }
            >
              {/* A glance at the five, in card order. The labels live in
                                the details below; repeating them here would make the
                                collapsed card the same list twice. Homology opens the
                                SecureDNA batch; Customer copies the verification link. */}
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1 }}>
                {BIOSECURITY_SCREENINGS.map((screening) => {
                  const statusLabel = biosecurityStatusLabel(
                    biosecurity[screening.key],
                  );
                  const action =
                    screening.key === "HOMOLOGY" && homologyDetailsAvailable
                      ? {
                          label: "View homology screening details",
                          onClick: handleHomologyDetails,
                        }
                      : screening.key === "CUSTOMER" && customerLinkAvailable
                        ? {
                            label: COPY_VERIFICATION_LINK,
                            onClick: handleCopyVerificationLink,
                          }
                        : null;
                  const title = action
                    ? `${action.label} — ${statusLabel}`
                    : `${screening.label}: ${statusLabel}`;
                  const icon = (
                    <BiosecurityStatusIcon
                      status={biosecurity[screening.key]}
                    />
                  );
                  return (
                    <Tooltip key={screening.key} title={title}>
                      {action ? (
                        <IconButton
                          size="small"
                          aria-label={action.label}
                          onClick={action.onClick}
                          sx={{ p: 0.25 }}
                        >
                          {icon}
                        </IconButton>
                      ) : (
                        <Box sx={{ display: "flex" }}>{icon}</Box>
                      )}
                    </Tooltip>
                  );
                })}
              </Box>
            </StatusPaneHeader>
          }
          actions={
            <>
              <Button
                variant="outlined"
                size="small"
                sx={railBtnSx}
                disabled={!id || homologyBusy}
                onClick={handleRerunHomologyScreening}
              >
                {homologyBusy ? "Screening…" : "Run screening"}
              </Button>
              {customerLinkAvailable && (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={railBtnSx}
                    disabled={!id || mintingVerificationLink}
                    onClick={handleCopyVerificationLink}
                  >
                    {mintingVerificationLink
                      ? "Creating link…"
                      : COPY_VERIFICATION_LINK}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={railBtnSx}
                    disabled={!id || mintingVerificationLink}
                    onClick={handleOpenHostedVerification}
                  >
                    Open hosted verification
                  </Button>
                </>
              )}
            </>
          }
          details={
            <BiosecurityScreeningSections
              screenings={biosecurity}
              notes={{ HOMOLOGY: homologyNote, CUSTOMER: customerNote }}
              homologyDetailsAvailable={homologyDetailsAvailable}
              onHomologyDetails={handleHomologyDetails}
              customerDetailsAvailable={customerLinkAvailable}
              onCustomerDetails={handleCopyVerificationLink}
              customerClickLabel={COPY_VERIFICATION_LINK}
            />
          }
        />

        <div ref={sowSectionRef}>
          <ProcessCard
            title="Statement of Work"
            defaultExpanded={
              !isSowProcessSettled(
                sowStatus.active?.status ?? sowStatus.current?.status,
              )
            }
            customerBadge={sowParties.customer}
            staffBadge={sowParties.staff}
            customerVersion={sowCustomerVersion}
            staffVersion={sowStaffVersion}
            statusPaneSx={{ bgcolor: sowStatusPaneColor }}
            statusPane={
              <SowStatusSummary
                sow={sowStatus.sow}
                active={sowStatus.active}
                current={sowStatus.current}
                hasUnsentDraft={sowStatus.hasUnsentDraft}
              />
            }
            actions={
              <>
                <Button
                  color={sowData ? "primary" : "secondary"}
                  variant="contained"
                  size="small"
                  startIcon={<DescriptionIcon />}
                  onClick={handleOpenSOWModal}
                  disabled={
                    !jobData || creatingSow || sowStatus.outWithCustomer
                  }
                  sx={railBtnSx}
                >
                  {creatingSow
                    ? "Generating…"
                    : sowData
                      ? "Manage SOW"
                      : "Generate SOW"}
                </Button>
                {sowStatus.outWithCustomer && (
                  <Button
                    variant="contained"
                    size="small"
                    color="warning"
                    startIcon={<UndoIcon />}
                    onClick={sowStatus.requestWithdraw}
                    disabled={sowStatus.busy}
                    sx={railBtnSx}
                  >
                    Withdraw from client
                  </Button>
                )}
                {sowStatus.everIssued && !sowStatus.alreadyCancelled && (
                  <Button
                    variant="contained"
                    size="small"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={sowStatus.requestCancel}
                    disabled={sowStatus.busy}
                    sx={railBtnSx}
                  >
                    Cancel SOW
                  </Button>
                )}
                {sowStatus.sow && sowStatus.forPdf && (
                  <SowPdfDownloadButton
                    sowNumber={sowStatus.sow.sowNumber}
                    version={sowStatus.forPdf}
                    button={(label, loading) => (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PictureAsPdfIcon />}
                        disabled={loading}
                        sx={railBtnSx}
                      >
                        {label}
                      </Button>
                    )}
                  />
                )}
              </>
            }
            details={
              sowStatus.sow ? (
                <SowStatusDetails
                  repair={sowStatus.repair}
                  missingFields={sowStatus.missingFields}
                  active={sowStatus.active}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No Statement of Work has been generated for this job yet.
                </Typography>
              )
            }
          />
        </div>

        {/* Read-only for staff, plus the pause switch when they hold
                    billing:view. Booking is the customer's act; confirming usage
                    stays on the Inventory schedule. */}
        <JobEquipmentBookingPanel jobId={id || ""} staffView />

        <div ref={invoiceSectionRef}>
          <InvoicePanel
            jobId={id || ""}
            jobDisplayId={jobData?.jobId ?? null}
            jobName={jobName}
            customerCategory={jobData?.customerCategory ?? null}
            sow={sowFullData}
            staffView
            issueBlockedReason={issueBlockedReason}
            documentStale={!!sowFullData?.documentStale}
            onChanged={refreshJobPage}
          />
        </div>

        {/* Payments belong to the job; every invoice version restates them. */}
        <JobPaymentsPanel jobId={id || ""} staffView />

        <div ref={commentsSectionRef}>
          <CommentsSection
            jobId={id || ""}
            currentUser={{
              email:
                userContext.userProps?.idTokenParsed?.email ??
                "technician@bu.edu",
              isStaff: true,
            }}
          />
        </div>

        {sowStatus.dialog}
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
          customerHasNotSeenEdits={customerHasNotSeenEdits}
        />
        <ScreeningBatchDetailsModal
          open={homologyModalOpen}
          batch={screeningBatchData?.screeningBatch ?? null}
          loading={screeningBatchLoading}
          error={
            screeningBatchError
              ? formatGqlError(
                  screeningBatchError,
                  "Could not load homology screening details.",
                )
              : null
          }
          onClose={() => setHomologyModalOpen(false)}
        />
        <SowEditorModal
          open={sowModalOpen}
          onClose={handleCloseSOWModal}
          jobId={id ?? ""}
          jobName={jobData?.name}
        />
        {id && (
          <JobActivityTimeline
            jobId={id}
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            onNavigate={handleTimelineNavigate}
          />
        )}
      </div>
    </div>
  );
}

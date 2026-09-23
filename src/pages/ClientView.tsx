import React, { useState, useContext, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

import InvoicePanel from "../components/billing/InvoicePanel";
import {
  GET_INVOICES_BY_JOB_ID,
  GET_OWN_JOB_BY_ID,
  GET_SOW_BY_JOB_ID,
  GET_SOW_EDITOR_STATE,
  GET_JOB_EQUIPMENT_BOOKING,
  GET_INVENTORY_AVAILABILITY,
  GET_JOB_BALANCE,
  GET_JOB_CHARGES,
  GET_JOB_PAYMENTS,
} from "../gql/queries";
import {
  CANCEL_JOB,
  REFRESH_JOB_ACLID_SCREENING,
  REJECT_JOB_REVIEW,
  RESTORE_JOB_VERSION,
  START_JOB_CUSTOMER_VERIFICATION,
} from "../gql/mutations";
import { openHostedVerification } from "../aclid/verificationWidget";
import { buildReasonedJobInput, retryOperationId } from "../utils/jobReview";
import { formatGqlError } from "../utils/gqlError";
import {
  JobSubmitterSummary,
  summarizeJobSubmitter,
} from "../utils/jobSubmitter";
import SowCustomerView from "../components/sow/SowCustomerView";
import JobEquipmentBookingPanel from "../components/booking/JobEquipmentBookingPanel";
import JobPaymentsPanel from "../components/billing/JobPaymentsPanel";
import ProcessCard from "../components/technician/ProcessCard";
import StatusPaneHeader from "../components/technician/StatusPaneHeader";
import {
  BIOSECURITY_SCREENINGS,
  biosecurityFromJob,
  biosecurityStatusColor,
  biosecurityStatusLabel,
  compositeBiosecurityStatus,
  customerDetail,
} from "../components/technician/biosecurityStatus";
import BiosecurityScreeningSections, {
  BiosecurityStatusIcon,
} from "../components/technician/BiosecurityScreeningSections";
import { CommentsSection } from "../components/CommentsSection";
import ResubmitJobModal from "../components/ResubmitJobModal";
import RequestEditAccessModal from "../components/RequestEditAccessModal";
import ReasonDialog from "../components/ReasonDialog";
import {
  diffJobGraphs,
  jobVersionDisplayLabel,
  latestVersion,
  selectedDiffPair,
} from "../utils/jobGraphDiff";
import { canRevertVersions } from "../utils/jobEditing";
import JobVersionHistory from "../components/JobVersionHistory";
import { versionWorkflowsAsCards } from "../controllers/jobGraphHydration";
import { AppContext } from "../contexts/App";
import { UserContext } from "../contexts/UserContext";
import JobWorkflowCards, {
  getParameterFiles as getJobParameterFiles,
  getSampleSheets,
  overlayLiveSampleSheets,
} from "../components/JobWorkflowCards";
import SampleSheetSection from "../components/SampleSheetSection";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SendIcon from "@mui/icons-material/Send";
import ThumbUpIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbDownIcon from "@mui/icons-material/ThumbDownAltOutlined";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import HistoryIcon from "@mui/icons-material/History";
import JobActivityTimeline, {
  TimelineSection,
} from "../components/JobActivityTimeline";
import {
  deriveCustomerLifecycle,
  validResponseAction,
} from "../utils/customerLifecycle";
import type { CustomerActionRequired } from "../utils/jobReview";
import {
  chipStatusBackground,
  isJobProcessSettled,
  jobPartyStatus,
  jobStatusColor,
  jobStatusLabel,
  latestCustomerVisibleJobVersion,
  partyVersionLabel,
} from "../utils/technicianProcessStatus";

export default function Tracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const userContext = useContext(UserContext);

  const [workflowName, setWorkflowName] = useState("");
  const [workflowState, setWorkflowState] = useState("");
  const [jobName, setJobName] = useState("");
  const [jobTime, setJobTime] = useState("");
  const [submitter, setSubmitter] = useState<JobSubmitterSummary>({
    user: "",
    onBehalfOf: null,
    organization: "",
  });
  const [workflowEmail, setWorkflowEmail] = useState(""); // ▶ URLSearchParams {}
  const [workflows, setWorklows] = useState([]); // ▶ URLSearchParams {}
  // The catalogue, for re-attaching parameter definitions to a version snapshot.
  const { services } = useContext(AppContext);
  // Which version of the graph is on screen, and what it is compared against.
  // Viewing starts unset and snaps to latest once versions load, matching
  // the job editor so Compare-to is a live controlled value on first paint.
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [baselineVersionNumber, setBaselineVersionNumber] = useState<
    number | null | undefined
  >(undefined);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [responseAction, setResponseAction] =
    useState<CustomerActionRequired | null>(null);
  const sowSectionRef = useRef<HTMLDivElement>(null);

  const skipQuery = !id || !userContext?.userProps?.isAuthenticated;

  const { data, loading, error, refetch } = useQuery(GET_OWN_JOB_BY_ID, {
    variables: { id: id! },
    skip: skipQuery,
    fetchPolicy: "network-only",
    errorPolicy: "all",
  });

  useEffect(() => {
    const job = data?.ownJobById;
    if (!job) return;
    setJobName(job.name ?? "");
    setJobTime(job.submitted ?? "");
    setSubmitter(summarizeJobSubmitter(job));
    setWorkflowEmail(job.email ?? "");
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
    const latest = latestVersion((job as any)?.versions ?? []);
    if (latest) {
      setViewingVersion(latest.versionNumber);
      setBaselineVersionNumber(undefined);
    }
  }, [data?.ownJobById]);

  const { data: sowByJobIdResult, refetch: refetchSow } = useQuery(
    GET_SOW_BY_JOB_ID,
    {
      variables: { jobId: id as string },
      skip: !id,
      fetchPolicy: "network-only",
    },
  );
  const sowFullData = sowByJobIdResult?.sowByJobId ?? null;
  const [refreshing, setRefreshing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const jobSectionRef = useRef<HTMLDivElement>(null);
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
      refetch(),
      refetchSow(),
      // The SOW card runs its own query. Without this, Refresh Job reloaded
      // the job and left the Statement of Work showing whatever it had —
      // including a version that had since been superseded.
      apolloClient.refetchQueries({
        include: [
          GET_INVOICES_BY_JOB_ID,
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

  const [restoreJobVersion] = useMutation(RESTORE_JOB_VERSION);
  const [restoringVersion, setRestoringVersion] = useState(false);

  const job = data?.ownJobById;

  /**
   * Restore the version being viewed. Offered only while the lab has actually
   * handed the job back for editing — `canRevertVersions` mirrors the server
   * gate, which is what decides whether the save is accepted at all.
   *
   * No picker bookkeeping afterwards: the effect on `data.ownJobById` snaps the
   * view to the newest allowed row on every refetch.
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
      window.alert(formatGqlError(e, "Could not restore that version."));
    } finally {
      setRestoringVersion(false);
    }
  };

  // Identity verification runs here and only here: the customer is the one
  // being verified. The staff page copies or opens the hosted URL rather than
  // completing KYC as the technician.
  const [startJobCustomerVerification] = useMutation(
    START_JOB_CUSTOMER_VERIFICATION,
  );
  const [refreshJobAclidScreening] = useMutation(REFRESH_JOB_ACLID_SCREENING);
  const [verifyingIdentity, setVerifyingIdentity] = useState(false);

  // Pull Aclid's latest verdict onto the job, then re-read the job so the card
  // reports it. Failures are swallowed: this runs right after opening the
  // hosted page, where there is nothing sensible to do with an error, and the
  // Refresh Job button is always there to try again.
  const refreshAclid = async () => {
    if (!id) return;
    try {
      await refreshJobAclidScreening({ variables: { jobId: id } });
      await refetch();
    } catch {
      // Reported on the next explicit refresh instead.
    }
  };

  /**
   * Start (or resume) identity verification on Aclid's hosted page.
   *
   * Embed is skipped: `verify.aclid.bio` sends `X-Frame-Options` /
   * `frame-ancestors` that refuse localhost (and any origin they have not
   * allow-listed). The widget script still loads, so a "script failed →
   * hosted" fallback never fires — the customer just sees "refused to
   * connect" in a blank iframe. Hosted is the path that works until Aclid
   * allow-lists Canvas origins. The card refreshes after the tab opens so
   * it reads In Progress while they finish.
   */
  const handleVerifyIdentity = async () => {
    // Also reached from the status-pane icon and the details chip, which
    // stay enabled (a disabled Tooltip child is a MUI warning), so the
    // re-entry guard lives here rather than on each control.
    if (!id || verifyingIdentity) return;
    setVerifyingIdentity(true);
    try {
      const result = await startJobCustomerVerification({
        variables: { jobId: id },
      });
      const url: string | undefined =
        result.data?.startJobCustomerVerification?.url;
      if (!url) throw new Error("No verification link was returned.");
      // One GraphQL round-trip past the click; if the browser still
      // blocks the tab, give them the URL rather than a silent no-op.
      if (!openHostedVerification(url)) {
        window.alert(
          `Your browser blocked the verification window. Open this link to verify your identity:\n\n${url}`,
        );
      }
      await refreshAclid();
    } catch (e) {
      window.alert(formatGqlError(e, "Could not start identity verification."));
    } finally {
      setVerifyingIdentity(false);
    }
  };

  const activeSow = sowFullData?.activeVersion ?? null;
  const visibleActiveSow =
    activeSow?.visibleToCustomer === true ? activeSow : null;
  const lifecycle = deriveCustomerLifecycle({
    state: job?.state,
    customerActionRequired: job?.customerActionRequired,
    activeSow: visibleActiveSow,
    signBlockers: sowFullData?.actionGate?.signBlockers,
  });

  // The three commands a customer can issue outside a prompt. Each owns only
  // its dialog's open state; the payload builders and the mutations do the rest.
  const [rejecting, setRejecting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [requestingEditAccess, setRequestingEditAccess] = useState(false);
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [rejectJobReview] = useMutation(REJECT_JOB_REVIEW);
  const [cancelJob] = useMutation(CANCEL_JOB);

  useEffect(() => {
    setResponseAction(null);
    setCommandError(null);
  }, [id]);

  useEffect(() => {
    setResponseAction((current) =>
      validResponseAction(current, lifecycle.primaryAction),
    );
  }, [lifecycle.primaryAction]);

  // A fresh operation id per dialog opening, so a retried submit resumes the
  // same command and a second, deliberate one never does.
  const commandOperationId = useRef<string | null>(null);
  const runCommand = async (
    send: (operationId: string) => Promise<unknown>,
    close: () => void,
    failure: string,
  ): Promise<void> => {
    setCommandBusy(true);
    setCommandError(null);
    try {
      commandOperationId.current = retryOperationId(
        commandOperationId.current,
        { type: "submit", candidate: crypto.randomUUID() },
      );
      await send(commandOperationId.current);
      await refreshJobPage();
      commandOperationId.current = retryOperationId(
        commandOperationId.current,
        { type: "success" },
      );
      close();
    } catch (err) {
      commandOperationId.current = retryOperationId(
        commandOperationId.current,
        { type: "failure" },
      );
      setCommandError(formatGqlError(err, failure));
    } finally {
      setCommandBusy(false);
    }
  };

  const sowStatus = visibleActiveSow?.status ?? null;
  // "Before the SOW is signed by both parties" — a document the client has
  // signed but the lab has not is still not an agreement, so only FINAL closes
  // the door. CLOSED and CANCELLED are already terminal.
  const canCancelJob =
    !!job &&
    job.state !== "CLOSED" &&
    job.state !== "CANCELLED" &&
    sowStatus !== "FINAL";
  // Tighter than cancelling on purpose: once the client has signed, the spec is
  // what was priced, and reopening it is the lab's call via a withdrawal.
  const canRequestEditAccess =
    !!job &&
    job.state !== "CLOSED" &&
    job.state !== "CANCELLED" &&
    sowStatus !== "SIGNED" &&
    sowStatus !== "FINAL" &&
    !(
      job.state === "CHANGES_REQUESTED" &&
      job.customerActionRequired === "EDIT_WORKFLOW"
    );
  const editAccessRequested = !!job?.editAccessRequestedAt;

  if (skipQuery) return <p>Loading...</p>;
  if (loading) return <p>Loading...</p>;
  // When backend returns errors (e.g. not found, forbidden), treat as no access unless we have job data
  if (error && !data?.ownJobById) {
    const msg = error.graphQLErrors?.[0]?.message ?? error.message;
    return (
      <p>
        Job not found. You may not have access to this job.
        {import.meta.env.DEV && msg && (
          <span
            style={{
              display: "block",
              marginTop: 8,
              fontSize: 12,
              color: "#666",
            }}
          >
            {msg}
          </span>
        )}
      </p>
    );
  }
  if (data && !data.ownJobById)
    return <p>Job not found. You may not have access to this job.</p>;

  // Highlight what changed since the last version written by the other side,
  // unless the reader has picked a different pair from the history.
  const versions = (data?.ownJobById as any)?.versions ?? [];
  const { current, baseline } = selectedDiffPair(
    versions,
    viewingVersion,
    baselineVersionNumber,
  );
  const graphDiff =
    current && baseline && current !== baseline
      ? diffJobGraphs(baseline.workflows, current.workflows)
      : undefined;

  // After the server filter, `current` is the latest allowed version when View
  // is defaulted — including a visible Request Changes event. Live
  // `job.workflows` is no longer the customer graph source.
  const latest = latestVersion(versions);
  const cardWorkflows = current
    ? overlayLiveSampleSheets(
        versionWorkflowsAsCards(current.workflows, services ?? []),
        workflows,
      )
    : workflows;
  /** Presentation only; replaceSampleSheet re-checks the job's state server-side. */
  const canReplaceSampleSheets =
    !!job &&
    job.state !== "CLOSED" &&
    job.state !== "CANCELLED" &&
    job.state !== "REJECTED";

  // The same rail metrics the staff job page uses, so the two pages line up.
  const railBtnSx = {
    textTransform: "none" as const,
    width: "100%",
    justifyContent: "flex-start",
    whiteSpace: "nowrap" as const,
  };
  // Who holds the job. Derived from its state alone — nothing here reads a
  // version number, which is what keeps a staff draft invisible.
  const jobParties = jobPartyStatus(job?.state);
  // The chip in the status pane, from the same helper the staff card uses, so
  // both pages name the same version. Safe to show: it is the newest version
  // the *customer* can see, and the server has already filtered this list to
  // exactly that. The rail labels stay hidden — those would name the lab's.
  const customerJobVersion = partyVersionLabel(
    latestCustomerVisibleJobVersion(versions),
  );

  // The same five screenings the staff card shows, read from the same job
  // fields, so the two pages agree on this job's biosecurity. Homology is
  // read-only here — SecureDNA's batch is the lab's to open. Customer is the
  // one the reader can act on: while Aclid has a screen for this job and has
  // not passed them, clicking it opens identity verification.
  const aclid = job?.aclidScreening ?? null;
  const biosecurity = biosecurityFromJob(job);
  const biosecurityComposite = compositeBiosecurityStatus(biosecurity);
  const customerNote = customerDetail(aclid);
  const customerVerificationAvailable =
    Boolean(aclid?.screenId) && biosecurity.CUSTOMER !== "PASSED";
  const showVerifyIdentity = biosecurity.CUSTOMER === "IN_PROGRESS";
  // As on the staff card: the pane's line explains the rollup, so Customer's
  // note sits there only when Customer is what the rollup is reporting.
  const biosecurityPaneNote =
    biosecurityComposite === biosecurity.CUSTOMER ? customerNote : null;

  const workflowCard = (
    <>
      {versions.length > 1 && (
        <Box sx={{ mb: 1.5 }}>
          <JobVersionHistory
            versions={versions}
            viewing={viewingVersion ?? latest?.versionNumber ?? 0}
            baseline={baseline?.versionNumber ?? null}
            onViewingChange={(v) => {
              setViewingVersion(v);
              setBaselineVersionNumber(undefined);
            }}
            onBaselineChange={setBaselineVersionNumber}
            onRestore={
              canRevertVersions(job, false) ? handleRestoreVersion : undefined
            }
            restoring={restoringVersion}
          />
        </Box>
      )}
      <JobWorkflowCards
        workflows={cardWorkflows}
        diff={graphDiff}
        currentVersion={current}
        baselineVersion={baseline}
        sampleSheets={{
          jobId: id || "",
          canEdit: canReplaceSampleSheets,
          onChanged: refreshJobPage,
        }}
      />
    </>
  );

  const getParameterFiles = () => getJobParameterFiles(cardWorkflows);

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
          {/* The job's name and the commands that act on it, on one line —
                    the same header the staff page uses. Viewing the canvas is not
                    here: it is permanent rather than a response to a prompt, so it
                    lives in the Job card's rail. Everything in this row either
                    reloads the page or answers the lifecycle's primary action. */}
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
              startIcon={<HistoryIcon />}
              onClick={() => setHistoryOpen(true)}
              disabled={!id}
              sx={{ textTransform: "none" }}
            >
              History
            </Button>
            {lifecycle.primaryAction === "REPLY" && (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => setResponseAction("REPLY")}
                sx={{ textTransform: "none" }}
              >
                Reply to lab
              </Button>
            )}
            {/* Opening the editor is the Job card's rail button, which
                        turns solid in this state; this row keeps the submit. */}
            {lifecycle.primaryAction === "EDIT_WORKFLOW" && (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => setResponseAction("EDIT_WORKFLOW")}
                sx={{ textTransform: "none" }}
              >
                Submit updated workflow
              </Button>
            )}
            {lifecycle.primaryAction === "APPROVE_WORKFLOW" && (
              <>
                <Button
                  variant="contained"
                  startIcon={<ThumbUpIcon />}
                  onClick={() => setResponseAction("APPROVE_WORKFLOW")}
                  sx={{ textTransform: "none" }}
                >
                  Approve workflow
                </Button>
                {/* Paired with Approve rather than hidden behind it: an
                                approval request with only one answer is not a request. */}
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<ThumbDownIcon />}
                  onClick={() => setRejecting(true)}
                  sx={{ textTransform: "none" }}
                >
                  Reject
                </Button>
              </>
            )}
            {lifecycle.primaryAction === "SIGN_SOW" && (
              <Button
                variant="contained"
                onClick={() => {
                  sowSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                  sowSectionRef.current?.focus({ preventScroll: true });
                }}
                sx={{ textTransform: "none" }}
              >
                Review and sign SOW
              </Button>
            )}
            {/* Standing commands rather than answers to the prompt above, so
                        they come after it — but in the same row and at the same size.
                        A second, smaller row read as a footnote and pushed the job's
                        details away from its title. Cancel is last, where the staff
                        header keeps Close job. */}
            {canRequestEditAccess && (
              <Button
                variant="outlined"
                startIcon={<EditNoteIcon />}
                onClick={() => setRequestingEditAccess(true)}
                disabled={editAccessRequested}
                sx={{ textTransform: "none" }}
              >
                {editAccessRequested
                  ? "Edit access requested"
                  : "Request Job Edit Access"}
              </Button>
            )}
            {canCancelJob && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelOutlinedIcon />}
                onClick={() => setCancelling(true)}
                sx={{ textTransform: "none" }}
              >
                Cancel job
              </Button>
            )}
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
        {commandError && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setCommandError(null)}
          >
            {commandError}
          </Alert>
        )}

        <div ref={jobSectionRef}>
          <ProcessCard
            title="Job"
            defaultExpanded={!isJobProcessSettled(job?.state)}
            customerBadge={jobParties.customer}
            staffBadge={jobParties.staff}
            // Same status, same chip, same colour as the staff card. The two
            // pages were reporting this job differently — "Accepted / v5.3"
            // against "Statement of Work withdrawn / Accepted" — which makes
            // the lab and the client unable to describe a job to each other.
            // The lifecycle line survives as the description, which is the one
            // place the two pages should differ: it is addressed to the reader.
            statusPaneSx={{
              bgcolor: chipStatusBackground(jobStatusColor(job?.state)),
            }}
            statusPane={
              <StatusPaneHeader
                status={jobStatusLabel(job?.state)}
                chips={
                  customerJobVersion === "—" ? undefined : (
                    <Chip
                      size="small"
                      label={customerJobVersion}
                      color={jobStatusColor(job?.state)}
                    />
                  )
                }
                reference={
                  <>
                    <b>Job ID:</b> {job?.jobId ?? id}
                  </>
                }
                description={lifecycle.body}
              />
            }
            actions={
              /* Contained, like the staff card's own View/Edit Job: it is the
                           one thing this card does, and an outlined button alone in an
                           otherwise empty rail reads as disabled. */
              <Button
                variant="contained"
                size="small"
                startIcon={
                  <AccountTreeIcon
                    sx={{ transform: "rotate(90deg) scaleY(-1)" }}
                  />
                }
                onClick={() => navigate(`/job_editor/${id}`)}
                sx={railBtnSx}
              >
                {lifecycle.primaryAction === "EDIT_WORKFLOW"
                  ? "View/Edit Job"
                  : "View workflow"}
              </Button>
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
                {workflowCard}
              </>
            }
          />
        </div>

        <ProcessCard
          title="Biosecurity"
          // Open while identity verification is waiting on the reader:
          // this is the card they have to act on, and the action lives
          // in its rail.
          defaultExpanded={showVerifyIdentity}
          customerBadge={null}
          staffBadge={null}
          statusPaneSx={{
            bgcolor: chipStatusBackground(
              biosecurityStatusColor(biosecurityComposite),
            ),
          }}
          statusPane={
            <StatusPaneHeader
              status={biosecurityStatusLabel(biosecurityComposite)}
              description={
                biosecurityPaneNote ??
                "Rolled up from primary and additional screening."
              }
            >
              {/* A glance at the five, in card order — the same row as
                                the staff card, with Customer rather than Homology as
                                the one that acts as a button. */}
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1 }}>
                {BIOSECURITY_SCREENINGS.map((screening) => {
                  const customerClickable =
                    screening.key === "CUSTOMER" &&
                    customerVerificationAvailable;
                  const title = customerClickable
                    ? `Open identity verification — ${biosecurityStatusLabel(biosecurity[screening.key])}`
                    : `${screening.label}: ${biosecurityStatusLabel(biosecurity[screening.key])}`;
                  const icon = (
                    <BiosecurityStatusIcon
                      status={biosecurity[screening.key]}
                    />
                  );
                  return (
                    <Tooltip key={screening.key} title={title}>
                      {customerClickable ? (
                        <IconButton
                          size="small"
                          aria-label="Open identity verification"
                          onClick={handleVerifyIdentity}
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
            showVerifyIdentity ? (
              <Button
                variant="contained"
                size="small"
                sx={railBtnSx}
                disabled={!id || verifyingIdentity}
                onClick={handleVerifyIdentity}
              >
                {verifyingIdentity ? "Opening…" : "Verify identity"}
              </Button>
            ) : undefined
          }
          details={
            <BiosecurityScreeningSections
              screenings={biosecurity}
              notes={{ CUSTOMER: customerNote }}
              customerDetailsAvailable={customerVerificationAvailable}
              onCustomerDetails={handleVerifyIdentity}
            />
          }
        />

        {/* Always rendered, like the staff page's SOW card: "the lab has not
                    sent you one" is a status, and a card that appears out of nowhere
                    partway through a job is harder to follow than one that changes
                    colour. */}
        <Box ref={sowSectionRef} tabIndex={-1} sx={{ outline: "none" }}>
          <SowCustomerView jobId={id || ""} onDeclined={refreshJobPage} />
        </Box>

        {/* Directly under the SOW, because that is what unlocks it: the
                    panel renders nothing at all for a caller who is not on this
                    job, and one sentence for one who is but cannot book yet. */}
        <JobEquipmentBookingPanel jobId={id || ""} />

        <div ref={invoiceSectionRef}>
          <InvoicePanel
            jobId={id || ""}
            jobDisplayId={data?.ownJobById?.jobId ?? null}
            jobName={jobName}
            customerCategory={data?.ownJobById?.customerCategory ?? null}
            sow={sowFullData}
          />
        </div>

        {/* Payments belong to the job; every invoice version restates them. */}
        <JobPaymentsPanel jobId={id || ""} />

        {/* Comments Section */}
        <div ref={commentsSectionRef}>
          <CommentsSection
            jobId={id || ""}
            currentUser={{
              email: workflowEmail,
              isStaff: false,
            }}
          />
        </div>
        {responseAction && (
          <ResubmitJobModal
            action={responseAction}
            open
            onClose={() => setResponseAction(null)}
            jobId={id || ""}
            onResubmitted={async () => {
              await Promise.all([refetch(), refetchSow()]);
              setResponseAction(null);
            }}
          />
        )}

        <ReasonDialog
          open={rejecting}
          title="Reject this workflow?"
          warning={
            "The lab will be told you are not approving these changes, and the job goes back to them for revision.\n\n" +
            "This does not cancel your job."
          }
          fieldLabel="Reason (the lab sees this)"
          confirmLabel="Reject workflow"
          busy={commandBusy}
          onCancel={() => setRejecting(false)}
          onConfirm={(reason) =>
            runCommand(
              (operationId) =>
                rejectJobReview({
                  variables: {
                    input: buildReasonedJobInput(
                      { operationId, jobId: id || "", reason },
                      "rejecting",
                    ),
                  },
                }),
              () => setRejecting(false),
              "Could not reject this workflow.",
            )
          }
        />

        <ReasonDialog
          open={cancelling}
          title="Cancel this job?"
          warning={
            "This ends the job. The lab stops work on it, any Statement of Work is cancelled with it, and you cannot undo this yourself.\n\n" +
            "If you only want changes made, use Request Job Edit Access instead."
          }
          fieldLabel="Reason (the lab sees this)"
          confirmLabel="Cancel job"
          busy={commandBusy}
          onCancel={() => setCancelling(false)}
          onConfirm={(reason) =>
            runCommand(
              (operationId) =>
                cancelJob({
                  variables: {
                    input: buildReasonedJobInput(
                      { operationId, jobId: id || "", reason },
                      "cancelling",
                    ),
                  },
                }),
              () => setCancelling(false),
              "Could not cancel this job.",
            )
          }
        />

        <RequestEditAccessModal
          open={requestingEditAccess}
          onClose={() => setRequestingEditAccess(false)}
          jobId={id || ""}
          onRequested={refreshJobPage}
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

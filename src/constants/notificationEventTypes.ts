export interface NotificationEventTypeDef {
  eventType: string;
  label: string;
  description: string;
  supportsEmail: boolean;
}

export const NOTIFICATION_EVENT_TYPES: readonly NotificationEventTypeDef[] = [
  {
    eventType: "JOB_SUBMITTED",
    label: "Job Submitted",
    description: "A new job has been submitted for review",
    supportsEmail: true,
  },
  {
    eventType: "JOB_REVIEWED",
    label: "Job Reviewed",
    description: "A job you submitted has been reviewed",
    supportsEmail: true,
  },
  {
    eventType: "JOB_REVIEW_RESPONSE",
    label: "Job Review Response",
    description: "A client responded to a job review",
    supportsEmail: true,
  },
  {
    eventType: "SOW_SENT",
    label: "SOW Sent",
    description: "A statement of work has been sent to you",
    supportsEmail: true,
  },
  {
    eventType: "SOW_SIGNED",
    label: "SOW Signed",
    description: "A statement of work has been signed by the client",
    supportsEmail: true,
  },
  {
    eventType: "SOW_FINALIZED",
    label: "SOW Finalized",
    description: "A statement of work has been finalized",
    supportsEmail: true,
  },
  {
    eventType: "COMMENT_CREATED",
    label: "Comment Created",
    description: "A new comment was posted on a job",
    supportsEmail: false,
  },
  {
    eventType: "LAB_NODE_ASSIGNED",
    label: "Lab Node Assigned",
    description: "A lab node was assigned to a staff member",
    supportsEmail: false,
  },
  {
    eventType: "LAB_NODE_STATE_CHANGED",
    label: "Lab Node State Changed",
    description: "A lab node changed its processing state",
    supportsEmail: false,
  },
];

import { gql } from "@apollo/client";

export const CREATE_WORKFLOW = gql`
    mutation createWorkflow($createWorkflowInput: AddWorkflowInput!) {
        createWorkflow(createWorkflowInput: $createWorkflowInput) {
            id
            nodes {
                label
            }
        }
    }
`;

export const CREATE_JOB = gql`
    mutation createJob($createJobInput: CreateJobInput!) {
        createJob(createJobInput: $createJobInput) {
            id
            jobId
            name
        }
    }
`;

export const CREATE_JOB_ATTACHMENT_UPLOAD_URLS = gql`
  mutation CreateJobAttachmentUploadUrls($jobId: ID!, $files: [JobAttachmentUploadRequest!]!) {
    createJobAttachmentUploadUrls(jobId: $jobId, files: $files) {
      filename
      uploadUrl
      key
      contentType
      size
    }
  }
`;

export const ADD_JOB_ATTACHMENTS = gql`
  mutation AddJobAttachments($jobId: ID!, $attachments: [JobAttachmentInput!]!) {
    addJobAttachments(jobId: $jobId, attachments: $attachments) {
      id
    }
  }
`;

export const CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS = gql`
  mutation CreateWorkflowParameterUploadUrls($files: [WorkflowParameterFileUploadRequest!]!) {
    createWorkflowParameterUploadUrls(files: $files) {
      clientToken
      filename
      uploadUrl
      key
      contentType
      size
    }
  }
`;

// Template mutations
export const CREATE_TEMPLATE = gql`
    mutation CreateTemplate($input: CreateTemplateInput!) {
        createTemplate(input: $input) {
            id
            name
            description
            createdAt
            columnMapping {
                field
                headerName
                type
                width
                order
            }
        }
    }
`;

export const UPDATE_TEMPLATE = gql`
    mutation UpdateTemplate($input: UpdateTemplateInput!) {
        updateTemplate(input: $input) {
            id
            name
            description
            createdAt
            columnMapping {
                field
                headerName
                type
                width
                order
            }
        }
    }
`;

export const DELETE_TEMPLATE = gql`
    mutation DeleteTemplate($id: ID!) {
        deleteTemplate(id: $id)
    }
`;

export const DELETE_TEMPLATE_BY_NAME = gql`
    mutation DeleteTemplateByName($name: String!) {
        deleteTemplateByName(name: $name)
    }
`;

export const UPDATE_WORKFLOW_STATE = gql`
    mutation updateWorkflowState($updateWorkflowState: UpdateWorkflowState!) {
        updateWorkflowState(updateWorkflowState: $updateWorkflowState) {
            id
            state
        }
    }
`;

export const MUTATE_WORKFLOW_STATE = gql`
    mutation updateWorkflowState($ID: ID!, $State: WorkflowState!) {
        changeWorkflowState(
            workflow: $ID,
            newState: $State
        ) {
            id
            state
        }
    }
`;

export const MUTATE_NODE_STATUS = gql`
    mutation changeWorkflowNodeState($_ID: ID!, $State: WorkflowNodeState!) {
        changeWorkflowNodeState(
            workflowNode: $_ID,
            newState: $State
        ) {
            _id
            state
            startedAt
        }
    }
`;

export const UPDATE_WORKFLOW_NODE_ASSIGNEE = gql`
    mutation UpdateWorkflowNodeAssignee($workflowNode: ID!, $assigneeId: String, $assigneeDisplayName: String) {
        updateWorkflowNodeAssignee(
            workflowNode: $workflowNode,
            assigneeId: $assigneeId,
            assigneeDisplayName: $assigneeDisplayName
        ) {
            _id
            assigneeId
            assigneeDisplayName
        }
    }
`;

export const UPDATE_WORKFLOW_NODE_ESTIMATED_TIME = gql`
    mutation UpdateWorkflowNodeEstimatedTime($workflowNode: ID!, $estimatedMinutes: Float) {
        updateWorkflowNodeEstimatedTime(
            workflowNode: $workflowNode,
            estimatedMinutes: $estimatedMinutes
        ) {
            _id
            estimatedMinutes
        }
    }
`;

export const MUTATE_JOB_STATE = gql`
    mutation changeJobState($ID: ID!, $State: JobState!) {
        changeJobState(
            job: $ID,
            newState: $State
        ) {
            id
            state
        }
    }
`;

export const CHANGE_JOB_CUSTOMER_CATEGORY = gql`
    mutation ChangeJobCustomerCategory($jobId: ID!, $customerCategory: CustomerCategory!) {
        changeJobCustomerCategory(jobId: $jobId, customerCategory: $customerCategory) {
            id
            customerCategory
        }
    }
`;

export const ADD_WORKFLOW_TO_JOB = gql`
  mutation AddWorkflowToJob($jobId: ID!, $workflow: AddWorkflowInput!) {
    addWorkflowToJob(jobId: $jobId, workflow: $workflow) {
      id
      name
    }
  }
`;

export const MARK_JOBS_FEED_VIEWED = gql`
  mutation MarkJobsFeedViewed {
    markJobsFeedViewed {
      viewedAt
      latestSubmittedAt
      hasUnseen
    }
  }
`;

export const CREATE_ANNOUNCEMENT = gql`
  mutation createAnnouncement($input: CreateAnnouncementInput!) {
    createAnnouncement(input: $input) {
      text
      timestamp
      is_displayed
    }
  }
`;

export const UPDATE_ANNOUNCEMENT = gql`
  mutation UpdateAnnouncement($input: UpdateAnnouncementInput!) {
    updateAnnouncement(input: $input) {
      timestamp
      is_displayed
    }
  }
`;

// SOW Mutations
export const CREATE_SOW = gql`
  mutation CreateSOW($input: CreateSOWInput!) {
    createSOW(input: $input) {
      id
      sowNumber
      date
      jobId
      jobName
      clientName
      clientEmail
      clientInstitution
      clientAddress
      scopeOfWork
      deliverables
      services {
        id
        name
        description
        cost
        category
      }
      timeline {
        startDate
        endDate
        duration
      }
      resources {
        projectManager
        projectLead
      }
      pricing {
        baseCost
        adjustments {
          id
          type
          description
          amount
          reason
        }
        totalCost
        discount {
          amount
          reason
        }
      }
      terms
      additionalInformation
      createdAt
      updatedAt
      createdBy
      status
    }
  }
`;

export const UPDATE_SOW = gql`
  mutation UpdateSOW($id: ID!, $input: UpdateSOWInput!) {
    updateSOW(id: $id, input: $input) {
      id
      sowNumber
      date
      jobId
      jobName
      clientName
      clientEmail
      clientInstitution
      clientAddress
      scopeOfWork
      deliverables
      services {
        id
        name
        description
        cost
        category
      }
      timeline {
        startDate
        endDate
        duration
      }
      resources {
        projectManager
        projectLead
      }
      pricing {
        baseCost
        adjustments {
          id
          type
          description
          amount
          reason
        }
        totalCost
        discount {
          amount
          reason
        }
      }
      terms
      additionalInformation
      createdAt
      updatedAt
      createdBy
      status
    }
  }
`;

export const UPSERT_SOW_FOR_JOB = gql`
  mutation UpsertSOWForJob($jobId: ID!, $input: CreateSOWInput!) {
    upsertSOWForJob(jobId: $jobId, input: $input) {
      id
      sowNumber
      date
      jobId
      jobName
      status
    }
  }
`;

export const DELETE_SOW = gql`
  mutation DeleteSOW($id: ID!) {
    deleteSOW(id: $id)
  }
`;

export const SUBMIT_SOW_SIGNATURE = gql`
  mutation SubmitSOWSignature($input: SubmitSOWSignatureInput!) {
    submitSOWSignature(input: $input) {
      id
      clientSignature {
        name
        title
        signedAt
        signatureDataUrl
      }
      technicianSignature {
        name
        title
        signedAt
        signatureDataUrl
      }
    }
  }
`;

export const CREATE_INVOICE = gql`
  mutation CreateInvoice($input: CreateInvoiceInput!) {
    createInvoice(input: $input) {
      id
      jobId
      jobDisplayId
      jobName
      invoiceNumber
      invoiceDate
      createdBy
      billedToName
      billedToEmail
      billedToAddress
      customerCategory
      services {
        id
        serviceId
        name
        description
        cost
        category
      }
      totalCost
      createdAt
    }
  }
`;

// Comments Mutations (TODO: Uncomment once backend is ready)
export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      content
      author
      authorType
      createdAt
      isInternal
    }
  }
`;

export const UPDATE_COMMENT = gql`
  mutation UpdateComment($id: ID!, $input: UpdateCommentInput!) {
    updateComment(id: $id, input: $input) {
      id
      content
      updatedAt
      isInternal
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id)
  }
`;

// Bug report mutations
export const CREATE_BUG_REPORT = gql`
  mutation CreateBugReport($input: CreateBugReportInput!) {
    createBugReport(input: $input) {
      id
      description
      reporterName
      reporterEmail
      createdAt
    }
  }
`;

export const CREATE_BUG_ATTACHMENT_UPLOAD_URLS = gql`
  mutation CreateBugAttachmentUploadUrls($bugId: ID!, $files: [BugAttachmentUploadRequest!]!) {
    createBugAttachmentUploadUrls(bugId: $bugId, files: $files) {
      filename
      uploadUrl
      key
      contentType
      size
    }
  }
`;

export const ADD_BUG_ATTACHMENTS = gql`
  mutation AddBugAttachments($bugId: ID!, $attachments: [BugAttachmentInput!]!) {
    addBugAttachments(bugId: $bugId, attachments: $attachments) {
      id
    }
  }
`;

export const SET_USER_KEYCLOAK_CUSTOMER_CATEGORY = gql`
  mutation SetUserKeycloakCustomerCategory($userId: ID!, $category: CustomerCategory) {
    setUserKeycloakCustomerCategory(userId: $userId, category: $category) {
      id
      username
      email
      firstName
      lastName
      customerCategory
      isDefaultExternalCustomer
    }
  }
`;

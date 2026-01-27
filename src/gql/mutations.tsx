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
            name
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

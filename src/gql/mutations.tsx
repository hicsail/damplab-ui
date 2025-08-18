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
    mutation createJob($createJobInput: CreateJob!) {
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

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

export const UPDATE_JOB = gql`
  mutation UpdateJob($id: ID!, $updateJobInput: UpdateJobInput!) {
    updateJob(id: $id, updateJobInput: $updateJobInput) {
      id
      name
      institute
      state
      workflows {
        id
      }
    }
  }
`;

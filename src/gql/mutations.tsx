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
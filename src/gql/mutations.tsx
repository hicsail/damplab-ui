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

export const UPDATE_BUNDLE = gql`
  mutation UpdateBundle($bundle: ID!, $changes: UpdateBundleInput!) {
    updateBundle(bundle: $bundle, changes: $changes) {
      id
      label
      icon
      nodes {
        _id
        id
        label
        service {
          id
          name
        }
        position {
          x
          y
        }
      }
      edges {
        id
        source {
          _id
          id
          label
        }
        target {
          _id
          id
          label
        }
        reactEdge
      }
    }
  }
`;

export const CREATE_BUNDLE = gql`
  mutation CreateBundle($input: CreateBundleInput!) {
    createBundle(input: $input) {
      id
      label
      icon
      nodes {
        id
        label
      }
      edges {
        id
      }
    }
  }
`;

export const DELETE_BUNDLE = gql `
  mutation DeleteBundle($id: ID!) {
    deleteBundle(id: $id)
  }
`;
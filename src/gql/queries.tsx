import { gql } from '@apollo/client';

export const GET_SERVICES = gql`
    query GetServices {
        services {
            id
            name
            icon
            parameters
            description
            paramGroups
            allowedConnections {
                id
                name
            }
        }
    }
`;

export const GET_BUNDLES = gql`
    query GetBundles {
        bundles {
            id
            label
            icon
            services {
                id
                name
                icon
                parameters
            }
        }
    }
`;

export const GET_CATEGORIES = gql`
    query categories {
        categories {
            id
            label
            services {
                id
                name
                icon
                parameters
                allowedConnections {
                    id
                }
            }
        }
    }
`;

export const GET_JOB_BY_ID = gql`
    query JobById($id: ID!) {
        jobById(id: $id) {
            id
            name
            username
            institute
            email
            state
            submitted
            notes
            workflows {
                id
                state
                name
                nodes {
                    _id
                    id
                    label
                    service {
                        id
                        name
                        icon
                        parameters
                        allowedConnections {
                            id
                            name
                        }
                    }
                    formData
                    state
                    additionalInstructions
                }
                edges {
                    source {
                        id
                    }
                    target {
                        id
                    }
                }
            }
        }
    }
`;

// get workflows from gql
export const GET_WORKFLOWS_BY_STATE = gql`
    query GetWorkflowsByState($state: WorkflowState!) {
        getWorkflowByState(state: $state) {
                id
                state
                name
                nodes {
                    service {
                        name
                        icon
                    }
                    formData
                }
                edges {
                    source {
                        id
                    }
                    target {
                        id
                    }
                }
        }
    }
`;

// workflow retrieval by state:(QUEUED | IN_PROGRESS | COMPLETE)
export const GET_WORKFLOWS_FOR_DOMINOS = gql`
    query GetWorkflowByState($state: WorkflowState!) {
        getWorkflowByState(state: $state) {
            id
            name
            state
            # dueDate
            # timeCompleted
            nodes {
                id
                _id
                label
                state
                # technicianFirst
                # technicianLast
                service {
                    icon
                }
            }
        }
    }
`;

// generally run with IDs retrieved from GetWorkflowsByState; needed for Dashboard (which displays all submitted jobs)
export const GET_JOB_BY_WORKFLOW_ID = gql`
    query JobByWorkflowId($id: ID!) {
        jobByWorkflowId(workflow: $id) {
            id
            name
            username
            institute
            email
            submitted
            notes
            state
        }
    }
`;

export const DELETE_CATEGORY = gql`
  mutation deleteCategory($category: ID!) {
    deleteCategory(category: $category)
  }
`;

export const UPDATE_CATEGORY = gql`
  mutation updateCategory($category: ID!, $changes: CategoryChange!) {
    updateCategory(category: $category, changes: $changes) {
      label
    }
  }
`;

export const CREATE_CATEGORY = gql`
  mutation createCategory($category: CreateCategory!) {
    createCategory(category: $category) {
      label
    }
  }
`;

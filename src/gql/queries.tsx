import { gql } from '@apollo/client';

export const GET_SERVICES = gql`
    query GetServices {
        services {
            id
            name
            icon 
            parameters
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

export const GET_WORKFLOW_BY_ID = gql`
    query workflowById($id: ID!) {
        workflowById(id: $id) {
            id
            state
            name
            nodes {
                id
                _id
                state
            }
        }
    }
`;
// someday: import from @apollo/client once Apollo Client 4 is out (which will address ESM issues) - see discussion at
// https://github.com/apollographql/apollo-client/issues/9976#issuecomment-1768446694
import { gql } from '@apollo/client/index.js';

export const GET_SERVICES = gql`
    query GetServices {
        services {
            id
            name
            price
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
    bundles{
      id
      label
      nodes {
        _id
        id
        label
        service {
          id
          name
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
                    price
                    service {
                        id
                        name
                        price
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

export const DELETE_SERVICE = gql`
  mutation deleteService($service: ID!) {
    deleteService(service: $service)
  }
`;

export const UPDATE_SERVICE = gql`
  mutation updateService($service: ID!, $changes: ServiceChange!) {
    updateService(service: $service, changes: $changes) {
      name
    }
  }
`;

export const CREATE_SERVICE = gql`
  mutation createService($service: CreateService!) {
    createService(service: $service) {
      id
      name
      price
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


export const GET_ANNOUNCEMENTS = gql`
  query{
	announcements{
    text
    timestamp
    is_displayed
    }
  }
`;

// Template queries
export const GET_TEMPLATES = gql`
  query GetTemplates {
    templates {
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

export const GET_TEMPLATE_BY_ID = gql`
  query GetTemplateById($id: ID!) {
    template(id: $id) {
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

export const GET_TEMPLATE_BY_NAME = gql`
  query GetTemplateByName($name: String!) {
    templateByName(name: $name) {
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

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
            deliverables
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
            sow {
                id
                sowNumber
                date
                status
                createdAt
                updatedAt
            }
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
                        deliverables
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

export const GET_OWN_JOB_BY_ID = gql`
    query ownJobById($id: ID!) {
        ownJobById(id: $id) {
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

// For Dashboard page; requires admin role.
export const GET_JOBS = gql`
    query GetJobs {
        jobs {
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
`
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
      id
      name
      price
      deliverables
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
      deliverables
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

// SOW Queries
export const GET_SOW_BY_ID = gql`
  query GetSOWById($id: ID!) {
    sowById(id: $id) {
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

export const GET_SOW_BY_JOB_ID = gql`
  query GetSOWByJobId($jobId: ID!) {
    sowByJobId(jobId: $jobId) {
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

// Comments Queries
export const GET_COMMENTS_BY_JOB_ID = gql`
  query GetCommentsByJobId($jobId: ID!) {
    commentsByJobId(jobId: $jobId) {
      id
      content
      author
      authorType
      createdAt
      updatedAt
      isInternal
    }
  }
`;

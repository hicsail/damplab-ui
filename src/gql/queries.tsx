// someday: import from @apollo/client once Apollo Client 4 is out (which will address ESM issues) - see discussion at
// https://github.com/apollographql/apollo-client/issues/9976#issuecomment-1768446694
import { gql } from '@apollo/client/index.js';

export const GET_SERVICES = gql`
    query GetServices {
        services {
            id
            name
            serviceCategoryNumber
            serviceCategoryName
            unit
            price
            internalPrice
            externalPrice
            pricing {
                internal
                external
                externalAcademic
                externalMarket
                externalNoSalary
                legacy
            }
            pricingMode
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
            clientDisplayName
            institute
            email
            customerCategory
            state
            submitted
            notes
            attachments {
                filename
                url
                uploadedAt
            }
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
                        internalPrice
                        externalPrice
                        pricing {
                            internal
                            external
                            externalAcademic
                            externalMarket
                            externalNoSalary
                            legacy
                        }
                        pricingMode
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
            clientDisplayName
            institute
            email
            customerCategory
            state
            submitted
            notes
            attachments {
                filename
                url
                uploadedAt
            }
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
                        internalPrice
                        externalPrice
                        pricing {
                            internal
                            external
                            externalAcademic
                            externalMarket
                            externalNoSalary
                            legacy
                        }
                        pricingMode
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

/** Legacy: unpaginated own jobs. Prefer OWN_JOBS (paginated) when backend supports it. */
export const GET_OWN_JOBS = gql`
    query ownJobs {
        ownJobs {
            id
            name
            state
            submitted
            sow {
                id
                sowNumber
                status
            }
        }
    }
`;

/** Paginated, filterable own jobs (Jobs list API). */
export const OWN_JOBS = gql`
    query OwnJobs($input: OwnJobsInput) {
        ownJobs(input: $input) {
            items {
                id
                name
                state
                submitted
                username
                institute
                email
                sow {
                    id
                    sowNumber
                    sowTitle
                    status
                }
            }
            totalCount
        }
    }
`;

/** Paginated, filterable all jobs – staff only (Dashboard). */
export const ALL_JOBS = gql`
    query AllJobs($input: AllJobsInput) {
        allJobs(input: $input) {
            items {
                id
                name
                state
                submitted
                username
                institute
                email
                sow {
                    id
                    sowNumber
                    sowTitle
                    status
                }
            }
            totalCount
        }
    }
`;

export const JOBS_FEED_STATUS = gql`
  query JobsFeedStatus {
    jobsFeedStatus {
      viewedAt
      latestSubmittedAt
      hasUnseen
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

// Lab monitor: workflows with parent job (name, submitted for sort)
export const GET_WORKFLOWS_FOR_LAB_MONITOR = gql`
    query GetWorkflowsForLabMonitor($state: WorkflowState!) {
        getWorkflowByState(state: $state) {
            id
            name
            state
            job {
                id
                name
                submitted
            }
        }
    }
`;

// Lab monitor: only approved-job workflows, with nodes and service names (for service-level cards)
export const GET_LAB_MONITOR_OPERATIONS = gql`
    query GetLabMonitorOperations($state: WorkflowState!) {
        getWorkflowsByStateForLabMonitor(state: $state) {
            id
            state
            job {
                id
                name
                submitted
            }
            nodes {
                _id
                id
                label
                state
                assigneeId
                assigneeDisplayName
                estimatedMinutes
                startedAt
                service {
                    name
                }
            }
        }
    }
`;

// Lab monitor: nodes by node state (for drag-drop columns). One query per column.
export const GET_LAB_MONITOR_NODES = gql`
    query GetLabMonitorNodes($nodeState: WorkflowNodeState!) {
        getLabMonitorNodes(nodeState: $nodeState) {
            _id
            id
            label
            state
            assigneeId
            assigneeDisplayName
            estimatedMinutes
            startedAt
            service {
                name
            }
            workflow {
                id
                job {
                    id
                    name
                    submitted
                }
            }
        }
    }
`;

export const GET_LAB_MONITOR_STAFF_LIST = gql`
    query GetLabMonitorStaffList {
        getLabMonitorStaffList {
            id
            displayName
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
            sow {
                id
                sowNumber
                status
            }
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

export const DELETE_BUNDLE = gql`
  mutation deleteBundle($bundle: ID!) {
    deleteBundle(bundle: $bundle)
  }
`;

export const UPDATE_BUNDLE = gql`
  mutation updateBundle($bundle: ID!, $changes: BundleChange!) {
    updateBundle(bundle: $bundle, changes: $changes) {
      id
      label
      icon
      services {
        id
      }
    }
  }
`;

export const CREATE_BUNDLE = gql`
  mutation createBundle($bundle: CreateBundle!) {
    createBundle(bundle: $bundle) {
      id
      label
      icon
      services {
        id
      }
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
      description
      serviceCategoryNumber
      serviceCategoryName
      unit
      price
      internalPrice
      externalPrice
      pricing {
        internal
        external
        externalAcademic
        externalMarket
        externalNoSalary
        legacy
      }
      pricingMode
      deliverables
    }
  }
`;

export const CREATE_SERVICE = gql`
  mutation createService($service: CreateService!) {
    createService(service: $service) {
      id
      name
      serviceCategoryNumber
      serviceCategoryName
      unit
      price
      internalPrice
      externalPrice
      pricing {
        internal
        external
        externalAcademic
        externalMarket
        externalNoSalary
        legacy
      }
      pricingMode
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
      sowTitle
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

// Bug report queries
export const GET_BUG_REPORTS = gql`
  query BugReports($filter: BugReportsFilterInput) {
    bugReports(filter: $filter) {
      items {
        id
        description
        reporterName
        reporterEmail
        createdAt
        attachments {
          filename
          url
        }
      }
    }
  }
`;

export const GET_BUG_REPORT_BY_ID = gql`
  query BugReportById($id: ID!) {
    bugReportById(id: $id) {
      id
      description
      reporterName
      reporterEmail
      createdAt
      attachments {
        filename
        url
      }
    }
  }
`;

export const SEARCH_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT = gql`
  query SearchKeycloakUsersForCustomerManagement($search: String!, $max: Int) {
    searchKeycloakUsersForCustomerManagement(search: $search, max: $max) {
      id
      username
      email
      firstName
      lastName
      customerCategory
    }
  }
`;

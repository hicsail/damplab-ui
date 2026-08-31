// someday: import from @apollo/client once Apollo Client 4 is out (which will address ESM issues) - see discussion at
// https://github.com/apollographql/apollo-client/issues/9976#issuecomment-1768446694
import { gql } from "@apollo/client/index.js";

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
      allowMultipleRuns
      icon
      parameters
      description
      paramGroups
      deliverables
      allowedConnections {
        id
        name
      }
      inventoryRequirements
      notes
      protocolIds
    }
  }
`;

/**
 * The client-facing catalog page's own query.
 *
 * Deliberately NOT a slice of GET_SERVICES: it hits a purpose-built server type so
 * the reduction is structural. `price` is the caller's own, resolved server-side;
 * `pricing` and `parameters` come back null without internal-fields:read, so the
 * page builds its columns from what it actually received rather than from a
 * client-side permission check.
 */
export const GET_CATALOG_SERVICES = gql`
  query GetCatalogServices {
    catalogServices {
      id
      name
      description
      serviceCategoryName
      unit
      price
      pricingModeLabel
      parameterCount
      pricing {
        internal
        externalAcademic
        externalMarket
        externalNoSalary
      }
      parameters
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

export const GET_BUNDLES_WITH_INVENTORY = gql`
  query GetBundlesWithInventory {
    bundles {
      id
      label
      icon
      services {
        id
        name
        icon
        inventoryRequirements
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
      latestContentVersionNumber
      jobId
      name
      username
      clientDisplayName
      institute
      email
      customerCategory
      state
      customerActionRequired
      handoverVersionNumber
      acceptedJobVersionNumber
      acceptedBillingFingerprint
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
            allowMultipleRuns
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
          usedInventory
          reactNode
        }
        edges {
          id
          reactEdge
          source {
            id
          }
          target {
            id
          }
        }
      }
      versions {
        id
        versionNumber
        displayVersion
        visibleToCustomer
        authorRole
        jobState
        isEvent
        createdAt
        createdByName
        note
        workflows {
          workflowId
          name
          nodes {
            id
            label
            serviceId
            serviceName
            formData
            additionalInstructions
            price
            position {
              x
              y
            }
          }
          edges {
            id
            source
            target
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
      latestContentVersionNumber
      jobId
      name
      username
      clientDisplayName
      institute
      email
      customerCategory
      state
      customerActionRequired
      handoverVersionNumber
      acceptedJobVersionNumber
      acceptedBillingFingerprint
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
            allowMultipleRuns
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
          usedInventory
          reactNode
        }
        edges {
          id
          reactEdge
          source {
            id
          }
          target {
            id
          }
        }
      }
      versions {
        id
        versionNumber
        displayVersion
        visibleToCustomer
        authorRole
        jobState
        isEvent
        createdAt
        createdByName
        note
        workflows {
          workflowId
          name
          nodes {
            id
            label
            serviceId
            serviceName
            formData
            additionalInstructions
            price
            position {
              x
              y
            }
          }
          edges {
            id
            source
            target
          }
        }
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
/**
 * The merged jobs page. Serves a client and a technician from one document —
 * `scope`, `createdBySub` and `assigneeId` are all enforced server-side, so a
 * client sending `scope: ALL` gets their own jobs rather than an error.
 */
export const JOBS_FOR_VIEWER = gql`
  query JobsForViewer($input: JobsForViewerInput) {
    jobsForViewer(input: $input) {
      items {
        id
        name
        state
        submitted
        username
        institute
        email
        isArchived
        archivedAt
        archivedBy
        archivedFromState
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

/** Distinct submitters, for the jobs page's client filter. jobs:view-all. */
export const JOB_CLIENTS = gql`
  query JobClients {
    jobClients {
      clientKey
      displayName
    }
  }
`;

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
        isArchived
        archivedAt
        archivedBy
        archivedFromState
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

export const ACTIVITY_EVENTS = gql`
  query ActivityEvents($limit: Int, $since: DateTime) {
    activityEvents(limit: $limit, since: $since) {
      id
      createdAt
      type
      message
      actorDisplayName
      jobId
      sowId
      sowVersionNumber
      workflowId
      workflowNodeId
      serviceName
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
  query GetLabMonitorNodes(
    $nodeState: WorkflowNodeState!
    $archiveFilter: NodeArchiveFilter
  ) {
    getLabMonitorNodes(nodeState: $nodeState, archiveFilter: $archiveFilter) {
      _id
      id
      label
      state
      isArchived
      archivedAt
      archivedBy
      archivedFromState
      assigneeId
      assigneeDisplayName
      estimatedMinutes
      startedAt
      usedInventory
      service {
        id
        name
        inventoryRequirements
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
      allowMultipleRuns
      icon
      deliverables
      notes
      protocolIds
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
      allowMultipleRuns
      icon
      parameters
      description
      paramGroups
      deliverables
      protocolIds
      allowedConnections {
        id
        name
      }
    }
  }
`;

/**
 * Announcements the caller may see. The server filters by audience — this query
 * takes no arguments because the caller is the token, not a parameter.
 */
export const GET_ANNOUNCEMENTS = gql`
  query GetAnnouncements {
    announcements {
      id
      text
      timestamp
      is_displayed
      audienceRoles
    }
  }
`;

/** Every announcement regardless of audience. Requires announcements:write. */
export const GET_ALL_ANNOUNCEMENTS = gql`
  query GetAllAnnouncements {
    allAnnouncements {
      id
      text
      timestamp
      is_displayed
      audienceRoles
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
      activeVersion {
        versionNumber
        status
        visibleToCustomer
        sourceJobVersionNumber
      }
      actionGate {
        canSign
        signBlockers
      }
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

export const GET_INVOICES_BY_JOB_ID = gql`
  query GetInvoicesByJobId($jobId: ID!) {
    invoicesByJobId(jobId: $jobId) {
      id
      jobId
      jobDisplayId
      jobName
      invoiceNumber
      invoiceDate
      createdBy
      billedToName
      billedToEmail
      billedToAddress
      customerCategory
      services {
        id
        serviceId
        name
        description
        cost
        category
      }
      subtotal
      adjustments {
        type
        description
        reason
        amount
        appliedAmount
        prorationFactor
      }
      totalCost
      createdAt
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
      attachments {
        filename
        key
        contentType
        size
        uploadedAt
        url
      }
    }
  }
`;

export const GET_ASSIGNED_OPERATIONS = gql`
  query AssignedOperations {
    assignedOperations {
      _id
      id
      label
      state
      startedAt
      completedSteps
      additionalInstructions
      formData
      service {
        id
        name
        description
        protocolIds
        parameters
      }
      job {
        id
        name
        jobId
      }
    }
  }
`;

export const GET_COMMENTS_BY_NODE_ID = gql`
  query GetCommentsByNodeId($nodeId: ID!) {
    commentsByNodeId(nodeId: $nodeId) {
      id
      content
      author
      authorType
      createdAt
      updatedAt
      isInternal
      attachments {
        filename
        key
        contentType
        size
        uploadedAt
        url
      }
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
        severity
        area
        stepsToReproduce
        expected
        actual
        tag
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

/**
 * The two axes a Customer Management row carries. `customerCategory` sets price,
 * `accessTier` sets permissions, and they move independently — one mutation each.
 *
 * `accessRoleMapped` is deliberately absent: it is only ever populated on the row
 * returned by the tier mutation, because checking it per row would double the
 * Keycloak Admin API calls a list page makes.
 */
const CUSTOMER_MANAGEMENT_ROW_FIELDS = `
  id
  username
  email
  firstName
  lastName
  customerCategory
  isDefaultExternalCustomer
  accessTier
`;

export const SEARCH_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT = gql`
  query SearchKeycloakUsersForCustomerManagement($search: String!, $max: Int) {
    searchKeycloakUsersForCustomerManagement(search: $search, max: $max) {
      ${CUSTOMER_MANAGEMENT_ROW_FIELDS}
    }
  }
`;

export const LIST_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT = gql`
  query ListKeycloakUsersForCustomerManagement($category: CustomerManagementUserListCategory!, $offset: Int, $limit: Int) {
    listKeycloakUsersForCustomerManagement(category: $category, offset: $offset, limit: $limit) {
      items {
        ${CUSTOMER_MANAGEMENT_ROW_FIELDS}
      }
      hasNextPage
    }
  }
`;

/**
 * The access tiers an administrator may preview the UI as.
 *
 * Fetched lazily by the header rather than folded into `myPermissions`: that one runs
 * in a top-level await before Apollo exists, and asking a backend that has not
 * deployed this field yet would fail the whole query and drop the caller to the
 * legacy staff boolean. Here, a failure just means no dropdown.
 */
export const GET_ROLE_PREVIEWS = gql`
  query RolePreviews {
    rolePreviews {
      tier
      label
      permissions
    }
  }
`;

// ─── Inventory ────────────────────────────────────────────────────────────
// CRUD + lookups for the inventory/scheduling feature.

const INVENTORY_FIELDS = `
  id
  name
  type
  description
  location
  quantity
  isDeleted
  bookable
  placements {
    stationId
    quantity
  }
  rateType
  pricing {
    internal
    externalAcademic
    externalMarket
    externalNoSalary
    external
    legacy
  }
  uniqueId
  tags
  modelNumber
  dimensionL { value unit }
  dimensionW { value unit }
  dimensionH { value unit }
`;

/**
 * Fields the model marks internal. Deliberately NOT part of INVENTORY_FIELDS: that
 * fragment is shared with `activeInventoryItems`, which feeds client-facing pickers
 * (BookInventory, the canvas). Appended only to the staff editing queries below.
 *
 * The three physical dimensions stay in the shared fragment above — they replaced the
 * old `dimensions` array and carry no field resolver, because how big a freezer is
 * was never staff-only. `lastModifiedBy` is here instead: it has no nulling resolver
 * either, so the only thing keeping it away from a client is that client queries do
 * not ask for it.
 */
const INVENTORY_INTERNAL_FIELDS = `
  serialNumber
  hasServiceContract
  serviceContractExpiration
  lastModifiedBy
`;

export const GET_INVENTORY_ITEMS = gql`
  query GetInventoryItems {
    inventoryItems {
      ${INVENTORY_FIELDS}
      ${INVENTORY_INTERNAL_FIELDS}
    }
  }
`;

export const GET_ACTIVE_INVENTORY_ITEMS = gql`
  query GetActiveInventoryItems {
    activeInventoryItems {
      ${INVENTORY_FIELDS}
    }
  }
`;

export const GET_PUBLIC_INVENTORY_ITEMS = gql`
  query GetPublicInventoryItems {
    publicInventoryItems {
      id
      name
      type
      description
      location
      quantity
      bookable
      placements {
        stationId
        quantity
      }
      tags
      modelNumber
      hasServiceContract
      dimensionL {
        value
        unit
      }
      dimensionW {
        value
        unit
      }
      dimensionH {
        value
        unit
      }
    }
  }
`;

export const CREATE_INVENTORY_ITEM = gql`
  mutation CreateInventoryItem($item: CreateInventoryItem!) {
    createInventoryItem(item: $item) {
      ${INVENTORY_FIELDS}
      ${INVENTORY_INTERNAL_FIELDS}
    }
  }
`;

export const UPDATE_INVENTORY_ITEM = gql`
  mutation UpdateInventoryItem($item: ID!, $changes: InventoryItemChange!) {
    updateInventoryItem(item: $item, changes: $changes) {
      ${INVENTORY_FIELDS}
      ${INVENTORY_INTERNAL_FIELDS}
    }
  }
`;

const BOOKING_FIELDS = `
  _id
  inventoryItem
  inventoryName
  inventoryType
  ownerSub
  ownerEmail
  ownerName
  ownerInstitution
  customerCategory
  kind
  startTime
  endTime
  quantity
  usedOn
  status
  actualHours
  actualQuantity
  usageConfirmed
  rateSnapshot
  cost
  billingStatus
  notes
`;

export const GET_MY_BOOKINGS = gql`
  query MyBookings {
    myBookings {
      ${BOOKING_FIELDS}
    }
  }
`;

export const GET_BOOKINGS = gql`
  query Bookings($from: DateTime, $to: DateTime, $inventoryItemId: ID) {
    bookings(from: $from, to: $to, inventoryItemId: $inventoryItemId) {
      ${BOOKING_FIELDS}
    }
  }
`;

export const GET_BILLABLE_OWNERS = gql`
  query BillableOwners {
    billableOwners {
      ownerSub
      ownerEmail
      ownerName
      bookingCount
      totalCost
    }
  }
`;

export const GET_BILLABLE_BOOKINGS = gql`
  query BillableBookings($ownerSub: String!) {
    billableBookings(ownerSub: $ownerSub) {
      ${BOOKING_FIELDS}
    }
  }
`;

export const DELETE_INVENTORY_ITEM = gql`
  mutation DeleteInventoryItem($item: ID!) {
    deleteInventoryItem(item: $item)
  }
`;

export const DELETE_ALL_INVENTORY_ITEMS = gql`
  mutation DeleteAllInventoryItems {
    deleteAllInventoryItems
  }
`;

export const CREATE_UPLOAD_LOG = gql`
  mutation CreateUploadLog($input: CreateUploadLogInput!) {
    createUploadLog(input: $input) {
      id
      uploadDate
    }
  }
`;

export const GET_UPLOAD_LOGS = gql`
  query UploadLogs {
    uploadLogs {
      id
      uploaderName
      uploaderSub
      fileName
      uploadDate
      rowCount
      createdCount
      updatedCount
      skippedCount
      failedCount
    }
  }
`;

export const GET_UPLOAD_LOG = gql`
  query UploadLog($id: ID!) {
    uploadLog(id: $id) {
      id
      uploaderName
      uploaderSub
      fileName
      uploadDate
      rowCount
      createdCount
      updatedCount
      skippedCount
      failedCount
      affectedItemIds
      fieldSnapshots {
        itemId
        action
        before
        after
      }
    }
  }
`;

// In-progress nodes currently holding any inventory — powers the availability board.
export const GET_IN_PROGRESS_NODES_HOLDING_INVENTORY = gql`
  query GetInProgressNodesHoldingInventory {
    getInProgressNodesHoldingInventory {
      _id
      label
      usedInventory
      startedAt
      estimatedMinutes
      assigneeDisplayName
      workflow {
        id
        job {
          id
          name
          jobId
        }
      }
      service {
        id
        name
      }
    }
  }
`;

// Set the inventory items a node is holding, with an optional planned time window.
// Rejects items conflicting with other operations OR calendar bookings (shared pool).
export const SET_WORKFLOW_NODE_USED_INVENTORY = gql`
  mutation SetWorkflowNodeUsedInventory(
    $_ID: ID!
    $inventoryIds: [ID!]!
    $reservationStart: DateTime
    $reservationEnd: DateTime
  ) {
    setWorkflowNodeUsedInventory(
      workflowNode: $_ID
      inventoryIds: $inventoryIds
      reservationStart: $reservationStart
      reservationEnd: $reservationEnd
    ) {
      _id
      state
      usedInventory
      inventoryReservationStart
      inventoryReservationEnd
    }
  }
`;

// Inventory items unavailable in a window — shared pool across operations + bookings.
export const GET_INVENTORY_AVAILABILITY = gql`
  query InventoryAvailability(
    $from: DateTime
    $to: DateTime
    $excludeNodeId: ID
  ) {
    inventoryAvailability(from: $from, to: $to, excludeNodeId: $excludeNodeId) {
      itemId
      source
      label
      start
      end
    }
  }
`;

export const GET_API_KEYS = gql`
  query ApiKeys {
    apiKeys {
      id
      name
      prefix
      scope
      createdBy
      createdAt
      lastUsedAt
      expiresAt
      revoked
      revokedAt
    }
  }
`;

// ── Stations (equipment→station map) ─────────────────────────────────────────
const STATION_FIELDS = `
  id
  name
  type
  zone
  capacity
  x
  y
  notes
  isDeleted
`;

export const GET_STATIONS = gql`
  query GetStations($includeDeleted: Boolean) {
    stations(includeDeleted: $includeDeleted) {
      ${STATION_FIELDS}
      equipment { id name placements { stationId quantity } }
    }
  }
`;

export const CREATE_STATION = gql`
  mutation CreateStation($input: CreateStationInput!) {
    createStation(input: $input) { ${STATION_FIELDS} }
  }
`;

export const UPDATE_STATION = gql`
  mutation UpdateStation($input: UpdateStationInput!) {
    updateStation(input: $input) { ${STATION_FIELDS} }
  }
`;

export const DELETE_STATION = gql`
  mutation DeleteStation($id: ID!) {
    deleteStation(id: $id) {
      id
      isDeleted
    }
  }
`;

// ── Protocol Step → Equipment map ────────────────────────────────────────────
export const GET_PROTOCOL_STEP_MAPPINGS = gql`
  query GetProtocolStepMappings($protocolId: String!) {
    protocolStepMappings(protocolId: $protocolId) {
      id
      protocolId
      stepId
      stepNumber
      stepTitle
      equipmentIds
      requiresNoEquipment
      paramTags
      reviewed
      updatedBy
    }
  }
`;

export const RESOLVE_PROTOCOL = gql`
  query ResolveProtocol($protocolId: String!) {
    resolveProtocol(protocolId: $protocolId) {
      protocolId
      title
      fullyMapped
      totalStepCount
      mappedStepCount
      steps {
        stepId
        number
        title
        status
        requiresNoEquipment
        issues
        equipment {
          id
          name
          missing
          placements {
            quantity
            station {
              id
              name
              zone
              x
              y
            }
          }
        }
      }
    }
  }
`;

export const UPSERT_PROTOCOL_STEP_MAPPING = gql`
  mutation UpsertProtocolStepMapping($input: UpsertProtocolStepMappingInput!) {
    upsertProtocolStepMapping(input: $input) {
      id
      stepId
      equipmentIds
      requiresNoEquipment
      paramTags
      reviewed
    }
  }
`;

export const DELETE_PROTOCOL_STEP_MAPPING = gql`
  mutation DeleteProtocolStepMapping($protocolId: String!, $stepId: String!) {
    deleteProtocolStepMapping(protocolId: $protocolId, stepId: $stepId)
  }
`;

// ── Bug backlog (ClickUp-backed, filed by the n8n triage workflow) ───────────
const BACKLOG_CARD_FIELDS = `
  id
  title
  status
  isClosed
  severity
  area
  category
  summary
  stepsToReproduce
  expected
  actual
  proposedFix
  assignees
  reporterName
  reporterEmail
  sessionTag
  occurrences
  sourceBugId
  commentCount
  clickupUrl
  createdAt
  updatedAt
`;

export const GET_BACKLOG_CARDS = gql`
  query BacklogCards {
    backlogAvailable
    backlogCards {
      ${BACKLOG_CARD_FIELDS}
    }
  }
`;

export const GET_BACKLOG_CARD = gql`
  query BacklogCard($id: ID!) {
    backlogCard(id: $id) {
      card {
        ${BACKLOG_CARD_FIELDS}
      }
      comments {
        id
        author
        fromApp
        text
        createdAt
      }
    }
  }
`;

/* ---------------------------------------------------------------------------
 * Versioned SOW document
 * ------------------------------------------------------------------------ */

export const SOW_VERSION_FIELDS = gql`
  fragment SowVersionFields on SowVersion {
    id
    versionNumber
    displayVersion
    status
    visibleToCustomer
    sentToCustomerAt
    note
    createdByName
    createdAt
    sourceJobVersionNumber
    clientSignature {
      name
      signedAt
      consentedGroups
      sectionInitials {
        key
        label
        initials
      }
      legacySignatureDataUrl
    }
    staffSignature {
      name
      signedAt
      sectionInitials {
        key
        label
        initials
      }
      legacySignatureDataUrl
    }
    fields {
      key
      label
      kind
      order
      value
      calculatedValue
      isOverridden
      isEnabled
      allowsTextOverride
      allowsEmpty
      requiresInitials
    }
    inputs {
      projectManager
      projectManagerId
      projectLead
      projectLeadId
      sowTitle
      scopeOfWork
      deliverables
      baseCost
      totalCost
      customerCategory
      periods {
        startDate
        durationDays
        label
      }
      services {
        serviceId
        name
        description
        cost
        unitCost
        multiplier
        runCount
      }
      adjustments {
        type
        description
        amount
        unitAmount
        multiplier
        category
        reason
      }
    }
  }
`;

/** Everything the SOW editor needs in one round trip. */
export const GET_SOW_EDITOR_STATE = gql`
  ${SOW_VERSION_FIELDS}
  query GetSowEditorState($jobId: ID!) {
    sowByJobId(jobId: $jobId) {
      id
      sowNumber
      currentVersionNumber
      activeVersionNumber
      documentStale
      liveCustomerCategory
      liveServices {
        serviceId
        name
        description
        cost
        unitCost
        multiplier
        runCount
      }
      actionGate {
        canSend
        sendBlockers
        canSign
        signBlockers
        canCountersign
        countersignBlockers
        missingFields
      }
      currentVersion {
        ...SowVersionFields
      }
      activeVersion {
        versionNumber
        displayVersion
        status
        visibleToCustomer
        sourceJobVersionNumber
      }
      versions {
        ...SowVersionFields
      }
    }
  }
`;

export const SOW_FIELD_PREVIEW = gql`
  query SowFieldPreview($sowId: ID!, $inputs: SowInputsInput!) {
    sowFieldPreview(sowId: $sowId, inputs: $inputs) {
      key
      calculatedValue
    }
  }
`;

/* SOW text blocks — the staff-managed prose library behind each SOW section. */

export const GET_SOW_PRESET_SECTIONS = gql`
  query sowPresetSections {
    sowPresetSections {
      key
      label
      presetCount
      defaultName
      updatedAt
      updatedByName
    }
  }
`;

export const GET_SOW_TEXT_PRESETS = gql`
  query sowTextPresets($sectionKey: String) {
    sowTextPresets(sectionKey: $sectionKey) {
      id
      sectionKey
      name
      text
      order
      updatedAt
      updatedByName
    }
  }
`;

// ─── Learning Hub ─────────────────────────────────────────────────────────
// Uploaded PDFs, each addressed to one or more access tiers. Which documents come
// back is decided server-side from the caller's roles; `downloadUrl` is a
// short-lived presigned GET minted per request, never a stored link.

export const GET_TRAINING_RESOURCES = gql`
  query TrainingResources {
    trainingResources {
      id
      title
      description
      audienceRoles
      updatedAt
      updatedBy
      file {
        filename
        contentType
        size
      }
      downloadUrl
    }
  }
`;

/**
 * A fresh link for one document.
 *
 * The URL embedded in the list response expires, and a list refetch to renew one
 * link would re-mint every other link too. This is the audience-checked entry point
 * server-side: an id outside the caller's audience simply returns null.
 */
export const GET_TRAINING_RESOURCE_DOWNLOAD_URL = gql`
  query TrainingResourceDownloadUrl($id: ID!) {
    trainingResourceDownloadUrl(id: $id)
  }
`;

/**
 * The Protocol Library's browse list, grouped by category.
 *
 * Categories come from the service catalog — protocols.io has none — so a protocol
 * inherits the category of the service that references it. Each entry is a
 * protocols.io round trip on the server, which is why ProtocolsService caches;
 * `unavailable` marks an entry whose fetch failed, so one bad protocol lists as
 * broken rather than blanking the page.
 */
export const GET_PROTOCOL_LIBRARY = gql`
  query GetProtocolLibrary {
    protocolLibrary {
      category
      protocols {
        protocolId
        title
        stepCount
        serviceNames
        unavailable
      }
    }
  }
`;

// ─── Notifications ───────────────────────────────────────────────────────────

export const MY_UNREAD_NOTIFICATION_COUNT = gql`
  query MyUnreadNotificationCount {
    myUnreadNotificationCount
  }
`;

export const MY_NOTIFICATIONS = gql`
  query MyNotifications($limit: Int, $offset: Int) {
    myNotifications(limit: $limit, offset: $offset) {
      items {
        id
        createdAt
        eventType
        title
        message
        link
        readAt
        actorDisplayName
      }
      unreadCount
    }
  }
`;

export const MY_NOTIFICATION_PREFERENCES = gql`
  query MyNotificationPreferences {
    myNotificationPreferences {
      emailDisabledEventTypes
      inAppDisabledEventTypes
    }
  }
`;

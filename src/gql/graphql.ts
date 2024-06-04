/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: any;
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: any;
};

export type AddEdgeInput = {
  /** ID used in identify the edge in the workflow */
  id: Scalars['ID'];
  /** React Flow representation of the graph for re-generating */
  reactEdge: Scalars['JSON'];
  /** The ID of the source node, this is the workflow ID */
  source: Scalars['ID'];
  /** The ID of the destination node, this is the workflow ID */
  target: Scalars['ID'];
};

export type AddNodeInput = {
  /** Additional instructions for this portion of the workflow */
  additionalInstructions: Scalars['String'];
  /** Parameters defined earlier in the graph */
  formData: Scalars['JSON'];
  /** ID used in identify the node in the workflow */
  id: Scalars['ID'];
  /** Human readable name of the service */
  label: Scalars['String'];
  /** React Flow representation of the graph for re-generating */
  reactNode: Scalars['JSON'];
  /** The ID of the service this node is a part of */
  serviceId: Scalars['ID'];
};

export type AddWorkflowInput = {
  /** The edges in the workflow */
  edges: Array<AddEdgeInput>;
  /** The name of the workflow */
  name: Scalars['String'];
  /** The nodes in the workflow */
  nodes: Array<AddNodeInput>;
};

export type Bundle = {
  __typename?: 'Bundle';
  icon: Scalars['String'];
  /** unique database generated id */
  id: Scalars['ID'];
  label: Scalars['String'];
  services: Array<DampLabService>;
};

/** Represents a category of DampLab services */
export type Category = {
  __typename?: 'Category';
  /** unique database generated ID */
  id: Scalars['ID'];
  label: Scalars['String'];
  /** List of DampLab services in this category */
  services: Array<DampLabService>;
};

export type CreateJob = {
  /** The email address of the user */
  email: Scalars['String'];
  /** The institute the user is from */
  institute: Scalars['String'];
  /** Human readable name of the workflow */
  name: Scalars['String'];
  /** The UTC date and time the job was submitted */
  submitted: Scalars['DateTime'];
  /** Username of the person who submitted the job */
  username: Scalars['String'];
  /** The workflows that were submitted together */
  workflows: Array<AddWorkflowInput>;
};

/** Services supported by the DampLab */
export type DampLabService = {
  __typename?: 'DampLabService';
  /** List of services this service can connect to */
  allowedConnections: Array<DampLabService>;
  /** URL to the icon of the service */
  icon: Scalars['String'];
  /** unique database generated ID */
  id: Scalars['ID'];
  /** Human readable name of the service */
  name: Scalars['String'];
  /** Parameters that are part of the service */
  parameters: Scalars['JSON'];
  /** The by-product of the service */
  result?: Maybe<Scalars['JSON']>;
  /** The expected fields in the result of the service */
  resultParams?: Maybe<Array<Scalars['String']>>;
};

/** Jobs encapsulate many workflows that were submitted together */
export type Job = {
  __typename?: 'Job';
  /** The email address of the user */
  email: Scalars['String'];
  id: Scalars['ID'];
  /** The institute the user is from */
  institute: Scalars['String'];
  /** Human readable name of the workflow */
  name: Scalars['String'];
  /** The date the job was submitted */
  submitted: Scalars['DateTime'];
  /** Username of the person who submitted the job */
  username: Scalars['String'];
  /** The workflows that were submitted together */
  workflows: Array<Workflow>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createJob: Job;
  updateWorkflowState: Workflow;
};


export type MutationCreateJobArgs = {
  createJobInput: CreateJob;
};


export type MutationUpdateWorkflowStateArgs = {
  updateWorkflowState: UpdateWorkflowState;
};

export type Query = {
  __typename?: 'Query';
  bundles: Array<Bundle>;
  categories: Array<Category>;
  getWorkflowByState: Array<Workflow>;
  jobById?: Maybe<Job>;
  jobByName?: Maybe<Job>;
  jobByWorkflowId: Job;
  services: Array<DampLabService>;
  workflowById?: Maybe<Workflow>;
};


export type QueryGetWorkflowByStateArgs = {
  state: WorkflowState;
};


export type QueryJobByIdArgs = {
  id: Scalars['ID'];
};


export type QueryJobByNameArgs = {
  name: Scalars['String'];
};


export type QueryJobByWorkflowIdArgs = {
  workflow: Scalars['ID'];
};


export type QueryWorkflowByIdArgs = {
  id: Scalars['ID'];
};

export type UpdateWorkflowState = {
  state: WorkflowState;
  workflowId: Scalars['ID'];
};

/** Represents a series of services that are connected together to form a workflow. */
export type Workflow = {
  __typename?: 'Workflow';
  /** The edges in the workflow */
  edges: Array<WorkflowEdge>;
  id: Scalars['ID'];
  /** The name of the workflow */
  name: Scalars['String'];
  /** The nodes in the workflow */
  nodes: Array<WorkflowNode>;
  /** Where in the process the Workflow is */
  state: WorkflowState;
};

/** Represents a single edge in a workflow */
export type WorkflowEdge = {
  __typename?: 'WorkflowEdge';
  /** ID used in identify the edge in the workflow */
  id: Scalars['ID'];
  /** React Flow representation of the graph for re-generating */
  reactEdge: Scalars['JSON'];
  /** The source node of the edge */
  source: WorkflowNode;
  /** The target node of the edge */
  target: WorkflowNode;
};

/** Represents a single node in a workflow. A node is a service with the cooresponding parameters populated. */
export type WorkflowNode = {
  __typename?: 'WorkflowNode';
  /** Additional instructions for this portion of the workflow */
  additionalInstructions: Scalars['String'];
  /** Parameters defined earlier in the graph */
  formData: Scalars['JSON'];
  /** ID used in identify the node in the workflow */
  id: Scalars['ID'];
  /** Human readable name of the service */
  label: Scalars['String'];
  /** React Flow representation of the graph for re-generating */
  reactNode: Scalars['JSON'];
  /** The service this node represents */
  service: DampLabService;
};

export enum WorkflowState {
  Approved = 'APPROVED',
  Processing = 'PROCESSING',
  Queued = 'QUEUED',
  Rejected = 'REJECTED',
  Submitted = 'SUBMITTED'
}

export type GetWorkflowsByStateQueryVariables = Exact<{ [key: string]: never; }>;


export type GetWorkflowsByStateQuery = { __typename?: 'Query', getWorkflowByState: Array<{ __typename?: 'Workflow', id: string, state: WorkflowState, name: string, nodes: Array<{ __typename?: 'WorkflowNode', formData: any, service: { __typename?: 'DampLabService', name: string, icon: string } }>, edges: Array<{ __typename?: 'WorkflowEdge', source: { __typename?: 'WorkflowNode', id: string }, target: { __typename?: 'WorkflowNode', id: string } }> }> };


export const GetWorkflowsByStateDocument = { "kind": "Document", "definitions": [{ "kind": "OperationDefinition", "operation": "query", "name": { "kind": "Name", "value": "GetWorkflowsByState" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "getWorkflowByState" }, "arguments": [{ "kind": "Argument", "name": { "kind": "Name", "value": "state" }, "value": { "kind": "EnumValue", "value": "APPROVED" } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "id" } }, { "kind": "Field", "name": { "kind": "Name", "value": "state" } }, { "kind": "Field", "name": { "kind": "Name", "value": "name" } }, { "kind": "Field", "name": { "kind": "Name", "value": "nodes" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "service" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "name" } }, { "kind": "Field", "name": { "kind": "Name", "value": "icon" } }] } }, { "kind": "Field", "name": { "kind": "Name", "value": "formData" } }] } }, { "kind": "Field", "name": { "kind": "Name", "value": "edges" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "source" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "id" } }] } }, { "kind": "Field", "name": { "kind": "Name", "value": "target" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "id" } }] } }] } }] } }] } }] } as unknown as DocumentNode<GetWorkflowsByStateQuery, GetWorkflowsByStateQueryVariables>;
import type { DocumentBlocker, SowStatus } from '../components/sow/sowTypes';
import type { CustomerActionRequired } from './jobReview';

export type CustomerLifecyclePrimaryAction = CustomerActionRequired | 'SIGN_SOW' | null;

export type CustomerLifecycleKey =
  | 'REPLY_REQUIRED'
  | 'WORKFLOW_EDIT_REQUIRED'
  | 'WORKFLOW_APPROVAL_REQUIRED'
  | 'CUSTOMER_ACTION_UNKNOWN'
  | 'SOW_PREPARING'
  | 'SOW_READY_TO_SIGN'
  | 'SOW_REISSUE_REQUIRED'
  | 'SOW_STATUS_UNAVAILABLE'
  | 'SOW_SIGNED'
  | 'SOW_FINALIZED'
  | 'SOW_WITHDRAWN'
  | 'CREATING'
  | 'SUBMITTED'
  | 'WAITING_FOR_SOW'
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'UNKNOWN';

export interface CustomerLifecycleInput {
  state?: string | null;
  customerActionRequired?: CustomerActionRequired | null;
  activeSow?: {
    status?: SowStatus | null;
    visibleToCustomer?: boolean | null;
  } | null;
  signBlockers?: readonly DocumentBlocker[] | null;
}

export interface CustomerLifecycleResult {
  key: CustomerLifecycleKey;
  title: string;
  body: string;
  primaryAction: CustomerLifecyclePrimaryAction;
}

export function validResponseAction(
  current: CustomerActionRequired | null,
  primaryAction: CustomerLifecyclePrimaryAction
): CustomerActionRequired | null {
  return current != null && current === primaryAction ? current : null;
}

const result = (
  key: CustomerLifecycleKey,
  title: string,
  body: string,
  primaryAction: CustomerLifecyclePrimaryAction = null
): CustomerLifecycleResult => ({ key, title, body, primaryAction });

function requestedCustomerAction(input: CustomerLifecycleInput): CustomerLifecycleResult | null {
  if (input.state !== 'CHANGES_REQUESTED') return null;

  switch (input.customerActionRequired) {
    case 'REPLY':
      return result('REPLY_REQUIRED', 'The lab needs your reply', 'Review the lab’s question, then send your reply.', 'REPLY');
    case 'EDIT_WORKFLOW':
      return result('WORKFLOW_EDIT_REQUIRED', 'Workflow changes requested', 'Update the workflow requested by the lab, then return the job for review.', 'EDIT_WORKFLOW');
    case 'APPROVE_WORKFLOW':
      return result('WORKFLOW_APPROVAL_REQUIRED', 'Workflow approval requested', 'Review the workflow changes made by the lab, then approve them.', 'APPROVE_WORKFLOW');
    default:
      return null;
  }
}

function activeSowLifecycle(input: CustomerLifecycleInput): CustomerLifecycleResult | null {
  const activeSow = input.activeSow;
  if (!activeSow || activeSow.visibleToCustomer !== true) return null;

  switch (activeSow.status) {
    case 'DRAFT':
      return null;
    case 'SENT':
      if (!Array.isArray(input.signBlockers)) {
        return result('SOW_STATUS_UNAVAILABLE', 'Signing status unavailable', 'The signing status is unavailable. Reload this job before continuing.');
      }
      if (input.signBlockers.length === 0) {
        return result('SOW_READY_TO_SIGN', 'Statement of Work ready to sign', 'Review the issued Statement of Work and sign it when you are ready.', 'SIGN_SOW');
      }
      return result(
        'SOW_REISSUE_REQUIRED',
        'Statement of Work not available to sign',
        'This version is not available to sign right now. The lab will reissue it — see the comments on this job for why.'
      );
    case 'SIGNED':
      return result('SOW_SIGNED', 'Statement of Work signed', 'Your signature was recorded. The Statement of Work is waiting for the lab.');
    case 'FINAL':
      return result('SOW_FINALIZED', 'Statement of Work finalized', 'The Statement of Work has been finalized.');
    case 'CANCELLED':
      return result('SOW_WITHDRAWN', 'Statement of Work withdrawn', 'This Statement of Work was withdrawn and is not available to sign.');
    default:
      return result('SOW_STATUS_UNAVAILABLE', 'Statement of Work status unavailable', 'The Statement of Work status is unavailable. Reload this job before continuing.');
  }
}

export function deriveCustomerLifecycle(input: CustomerLifecycleInput): CustomerLifecycleResult {
  if (input.state === 'CHANGES_REQUESTED') {
    const requestedAction = requestedCustomerAction(input);
    return requestedAction ?? result('CUSTOMER_ACTION_UNKNOWN', 'Requested action unavailable', 'The requested action status is unavailable. Contact the lab before continuing.');
  }

  if (input.state === 'ACCEPTED') {
    const sowLifecycle = activeSowLifecycle(input);
    // Also where a withdrawn SOW lands: nothing is in force, so there is
    // nothing to sign, and the automated comment explains why.
    return sowLifecycle ?? result('SOW_PREPARING', 'Statement of Work in preparation', 'The lab is preparing the Statement of Work. There is nothing to sign yet.');
  }

  switch (input.state) {
    case 'CREATING':
      return result('CREATING', 'Preparing your request', 'Your job request is being prepared.');
    case 'SUBMITTED':
      return result('SUBMITTED', 'Submitted for review', 'The lab is reviewing your request.');
    case 'WAITING_FOR_SOW':
      return result('WAITING_FOR_SOW', 'Waiting for the lab', 'The lab is preparing the next step for this job.');
    case 'QUEUED':
      return result('QUEUED', 'Queued for the lab', 'Your job is queued for lab work.');
    case 'IN_PROGRESS':
      return result('IN_PROGRESS', 'Work in progress', 'The lab is working on your job.');
    case 'COMPLETE':
      return result('COMPLETE', 'Work complete', 'The lab has completed the work for this job.');
    case 'CLOSED':
      return result('CLOSED', 'Job closed', 'This job has been closed.');
    case 'CANCELLED':
      return result('CANCELLED', 'Job cancelled', 'You cancelled this job. Contact the lab if you want to start it again.');
    case 'REJECTED':
      return result('REJECTED', 'Request not accepted', 'The lab could not accept this request.');
    default:
      return result('UNKNOWN', 'Status unavailable', 'The latest status is not available yet.');
  }
}

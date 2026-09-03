import { beforeEach, describe, it, expect } from 'vitest';
import { hasUnseenStaffEdits } from './jobGraphDiff';
import type { JobVersionLike } from './jobGraphDiff';

/**
 * Whether accepting a job would bind the customer to lab edits they have never
 * been shown — the thing the Review modal's red warning is asserting.
 *
 * Every case below is one the naive reading ("the newest content version is
 * staff-authored") gets wrong.
 */

let n = 0;
const version = (over: Partial<JobVersionLike> = {}): JobVersionLike =>
  ({
    versionNumber: ++n,
    authorRole: 'STAFF',
    isEvent: false,
    visibleToCustomer: false,
    workflows: [],
    ...over
  }) as JobVersionLike;

const customerEdit = (): JobVersionLike => version({ authorRole: 'CUSTOMER', visibleToCustomer: true });
const staffEdit = (): JobVersionLike => version({ authorRole: 'STAFF', visibleToCustomer: false });
/** A withdrawal restores the customer's own graph. Staff-authored, but nothing new to see. */
const staffRestore = (): JobVersionLike => version({ authorRole: 'STAFF', visibleToCustomer: true });
const event = (authorRole: 'STAFF' | 'CUSTOMER'): JobVersionLike => version({ authorRole, isEvent: true, visibleToCustomer: true });

beforeEach(() => {
  n = 0;
});

describe('hasUnseenStaffEdits', () => {
  it('warns when the lab has edited since the customer submitted', () => {
    expect(hasUnseenStaffEdits([customerEdit(), staffEdit()])).toBe(true);
  });

  it('stops warning once the customer resubmits with their own changes', () => {
    expect(hasUnseenStaffEdits([customerEdit(), staffEdit(), customerEdit()])).toBe(false);
  });

  it('ignores the state-change events a review appends', () => {
    // Accepting, requesting changes and resubmitting all write STAFF- or
    // CUSTOMER-authored event rows whose graph is a verbatim copy. Counting them
    // as edits would flip the warning on every review decision.
    expect(hasUnseenStaffEdits([customerEdit(), staffEdit(), customerEdit(), event('STAFF'), event('CUSTOMER')])).toBe(false);
  });

  it('warns on a job staff submitted for the client, which has no customer version at all', () => {
    // /staff_submit produces a job whose every version is STAFF-authored. This is
    // the case where accepting is most plainly on the customer's behalf — they
    // have seen none of it — so requiring a prior customer submission (an earlier
    // draft did) silently switched the warning off exactly where it matters most.
    expect(hasUnseenStaffEdits([staffEdit(), staffEdit()])).toBe(true);
  });

  it('warns on a staff edit even with no customer version below it', () => {
    expect(hasUnseenStaffEdits([staffEdit()])).toBe(true);
  });

  it('does not warn after a withdrawal restores the customer own graph', () => {
    // Withdrawing writes a staff-authored content version, but it is the
    // customer's graph put back, published to them — not a lab edit.
    expect(hasUnseenStaffEdits([customerEdit(), staffEdit(), staffRestore()])).toBe(false);
  });

  it('stops warning once the edits are published to the customer', () => {
    // Acceptance publishes the staff version. Re-accepting an accepted job must
    // not re-raise a warning about edits the customer has already been shown.
    expect(hasUnseenStaffEdits([customerEdit(), version({ authorRole: 'STAFF', visibleToCustomer: true })])).toBe(false);
  });

  it('warns on the newest edit even when an older staff edit was published', () => {
    const published = version({ authorRole: 'STAFF', visibleToCustomer: true });
    expect(hasUnseenStaffEdits([customerEdit(), published, staffEdit()])).toBe(true);
  });

  it('says no for a job with no versions at all', () => {
    expect(hasUnseenStaffEdits([])).toBe(false);
  });

  it('treats a legacy row with no visibleToCustomer flag as seen', () => {
    // The backend reads a missing flag as visible; so must this, or every job
    // predating the field would warn.
    expect(hasUnseenStaffEdits([customerEdit(), version({ authorRole: 'STAFF', visibleToCustomer: undefined })])).toBe(false);
  });
});

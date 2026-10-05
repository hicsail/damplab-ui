import { describe, expect, it } from 'vitest';
import { submissionLine, summarizeJobSubmitter } from './jobSubmitter';

/**
 * Who a job's header should name.
 *
 * On a staff-submitted job `username` and `email` are the technician's — they come
 * from the submitter's token — while `clientDisplayName` and `clientEmail` are the
 * person the work is for. Showing the first pair under "User" credits the job to
 * the wrong party; showing only the second hides who actually entered it.
 */
describe('summarizeJobSubmitter', () => {
  it('names the customer and nobody else on an ordinary job', () => {
    const summary = summarizeJobSubmitter({ username: 'crivera', clientDisplayName: 'Cara Rivera', email: 'cara@bu.edu', institute: 'Boston University' });

    expect(summary.user).toBe('Cara Rivera (cara@bu.edu)');
    expect(summary.onBehalfOf).toBeNull();
    expect(summary.organization).toBe('Boston University');
  });

  it('names the client, then credits the staff member who entered it', () => {
    const summary = summarizeJobSubmitter({
      username: 'Tess Technician',
      email: 'tech@damplab.org',
      clientDisplayName: 'Cara Rivera',
      clientEmail: 'cara@bu.edu',
      institute: 'Boston University'
    });

    expect(summary.user).toBe('Cara Rivera (cara@bu.edu)');
    expect(summary.onBehalfOf).toBe('Submitted on their behalf by Tess Technician (tech@damplab.org)');
  });

  it("keeps the organization as the job's institute, which is the client's either way", () => {
    // Staff type the client's institute on the submission form, and the SOW
    // already copies job.institute into clientInstitution.
    const summary = summarizeJobSubmitter({ username: 'Tess', email: 'tech@damplab.org', clientEmail: 'cara@bu.edu', institute: 'Boston University' });

    expect(summary.organization).toBe('Boston University');
  });

  it('falls back to the email when a client has no display name', () => {
    const summary = summarizeJobSubmitter({ username: 'Tess', email: 'tech@damplab.org', clientEmail: 'cara@bu.edu' });

    expect(summary.user).toBe('cara@bu.edu');
  });

  it('drops the parenthetical rather than printing an empty one', () => {
    const summary = summarizeJobSubmitter({ username: 'crivera', institute: 'BU' });

    expect(summary.user).toBe('crivera');
  });

  it('treats a blank clientEmail as not-on-behalf-of', () => {
    // Older jobs and any hand-edited row: an empty string must not read as
    // "staff submitted this", which would credit the customer's own job to them.
    const summary = summarizeJobSubmitter({ username: 'crivera', email: 'cara@bu.edu', clientEmail: '   ' });

    expect(summary.onBehalfOf).toBeNull();
    expect(summary.user).toBe('crivera (cara@bu.edu)');
  });

  it('survives a job with nothing on it', () => {
    const summary = summarizeJobSubmitter({});

    expect(summary.user).toBe('');
    expect(summary.onBehalfOf).toBeNull();
    expect(summary.organization).toBe('');
  });
});

describe('summarizeJobSubmitter — client-owned staff submissions (B30)', () => {
  it('names the client from the owner fields and credits staff from submittedBy', () => {
    const summary = summarizeJobSubmitter({
      username: 'cara',
      email: 'cara@bu.edu',
      primaryClientEmail: 'cara@bu.edu',
      clientEmail: 'cara@bu.edu',
      clientDisplayName: 'Cara Rivera',
      institute: 'Boston University',
      submittedBy: { sub: 'admin-1', email: 'tech@damplab.org', name: 'Tess Technician' }
    });
    expect(summary.user).toBe('Cara Rivera (cara@bu.edu)');
    expect(summary.onBehalfOf).toBe('Submitted on their behalf by Tess Technician (tech@damplab.org)');
  });

  it('never names the staff member as the user, even with no client display name', () => {
    const summary = summarizeJobSubmitter({ email: 'new@bu.edu', clientEmail: 'new@bu.edu', primaryClientEmail: 'new@bu.edu', submittedBy: { sub: 'admin-1', email: 'tech@damplab.org', name: 'Tess' } });
    expect(summary.user).toBe('new@bu.edu (account pending)');
    expect(summary.user).not.toContain('tech@damplab.org');
  });

  it('names the client from their account once it exists, and says pending until then', () => {
    const job = { email: 'new@bu.edu', clientEmail: 'new@bu.edu', primaryClientEmail: 'new@bu.edu', submittedBy: { sub: 'admin-1', email: 'tech@damplab.org', name: 'Tess' } };
    expect(summarizeJobSubmitter({ ...job, clientName: null }).user).toBe('new@bu.edu (account pending)');
    expect(summarizeJobSubmitter({ ...job, clientName: 'Nia Wells' }).user).toBe('Nia Wells (new@bu.edu)');
  });

  it('still reads a legacy, unmigrated staff submission (no submittedBy; username/email are the technician\'s)', () => {
    const summary = summarizeJobSubmitter({ username: 'Tess Technician', email: 'tech@damplab.org', clientDisplayName: 'Cara Rivera', clientEmail: 'cara@bu.edu' });
    expect(summary.user).toBe('Cara Rivera (cara@bu.edu)');
    expect(summary.onBehalfOf).toBe('Submitted on their behalf by Tess Technician (tech@damplab.org)');
  });
});

describe('submissionLine', () => {
  it('says a staff-submitted job was submitted for its client, not by them', () => {
    const summary = summarizeJobSubmitter({
      email: 'cara@bu.edu',
      clientEmail: 'cara@bu.edu',
      clientName: 'Cara Rivera',
      institute: 'Boston University',
      submittedBy: { sub: 'admin-1', email: 'tech@damplab.org', name: 'Tess Technician' }
    });
    expect(submissionLine(summary, '2026-10-02 09:30')).toBe('Submitted for Cara Rivera (cara@bu.edu), Boston University on 2026-10-02 09:30');
  });

  it('keeps the old wording when the customer submitted it themselves', () => {
    const summary = summarizeJobSubmitter({ username: 'crivera', clientDisplayName: 'Cara Rivera', email: 'cara@bu.edu', institute: 'Boston University' });
    expect(submissionLine(summary, '2026-10-02 09:30')).toBe('Cara Rivera (cara@bu.edu), Boston University submitted this job on 2026-10-02 09:30');
  });
});

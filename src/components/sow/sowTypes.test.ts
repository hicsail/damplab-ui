import { describe, it, expect } from 'vitest';
import { sowStatusLabel, versionDisplayLabel } from './sowTypes';

describe('sowStatusLabel', () => {
  it('translates internal statuses to customer-facing wording', () => {
    expect(sowStatusLabel('DRAFT')).toBe('Draft');
    expect(sowStatusLabel('SENT')).toBe('Sent to Customer');
    expect(sowStatusLabel('SIGNED')).toBe('Customer Signed');
    expect(sowStatusLabel('FINAL')).toBe('Finalized');
    expect(sowStatusLabel('CANCELLED')).toBe('Cancelled');
  });

  it('falls back to a dash for a missing status', () => {
    expect(sowStatusLabel(null)).toBe('—');
    expect(sowStatusLabel(undefined)).toBe('—');
  });
});

describe('versionDisplayLabel', () => {
  it('prefers the server-computed label', () => {
    expect(versionDisplayLabel({ versionNumber: 3, displayVersion: '1.2' })).toBe('1.2');
  });

  it('decodes versionNumber itself if the server has not labelled it yet', () => {
    expect(versionDisplayLabel({ versionNumber: 1002 })).toBe('1.2');
    expect(versionDisplayLabel({ versionNumber: 1 })).toBe('0.1');
  });

  it('returns an empty string for no version', () => {
    expect(versionDisplayLabel(null)).toBe('');
    expect(versionDisplayLabel(undefined)).toBe('');
  });
});

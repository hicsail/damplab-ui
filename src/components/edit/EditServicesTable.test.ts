import { describe, expect, it } from 'vitest';
import { uploadUnavailableMessage } from './EditServicesTable';

describe('uploadUnavailableMessage (fix round 1)', () => {
  it('is null when both queries succeeded', () => {
    expect(uploadUnavailableMessage(undefined, undefined)).toBeNull();
  });

  it('names parameter sets when only that query failed', () => {
    expect(uploadUnavailableMessage(new Error('boom'), undefined)).toBe(
      "Upload is unavailable: couldn't load parameter sets."
    );
  });

  it('names deleted operations when only that query failed', () => {
    expect(uploadUnavailableMessage(undefined, new Error('boom'))).toBe(
      "Upload is unavailable: couldn't load deleted operations."
    );
  });

  it('names both when both queries failed', () => {
    expect(uploadUnavailableMessage(new Error('a'), new Error('b'))).toBe(
      "Upload is unavailable: couldn't load parameter sets and deleted operations."
    );
  });
});

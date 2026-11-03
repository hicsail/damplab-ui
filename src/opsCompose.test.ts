import { describe, expect, it } from 'vitest';
import staging from '../ops/docker-compose.staging.yml?raw';
import prod from '../ops/docker-compose.prod.yml?raw';

describe('ops compose files pass their own Aclid key (biosecurity-tweaks behaviour 5)', () => {
  it('staging passes the test key and never the prod key', () => {
    expect(staging).toMatch(/- ACLID_TEST_API_KEY=\$\{ACLID_TEST_API_KEY:-\}/);
    expect(staging).not.toContain('ACLID_PROD_API_KEY');
  });
  it('prod passes the prod key and never the test key', () => {
    expect(prod).toMatch(/- ACLID_PROD_API_KEY=\$\{ACLID_PROD_API_KEY:-\}/);
    expect(prod).not.toContain('ACLID_TEST_API_KEY');
  });
  it('both keep the legacy name as the fallback', () => {
    for (const file of [staging, prod]) expect(file).toMatch(/- ACLID_API_KEY=\$\{ACLID_API_KEY:-\}/);
  });
});

import { describe, expect, it } from 'vitest';
import queries from './queries.tsx?raw';
import mutations from './mutations.tsx?raw';

describe('retired Biosecurity switch', () => {
  it('no GraphQL document asks for the retired switch (behaviour 19)', () => {
    for (const doc of [queries, mutations]) expect(doc).not.toMatch(/showBiosecurity|ShowBiosecurity/);
  });
});

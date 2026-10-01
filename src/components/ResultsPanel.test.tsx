import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ResultsPanel, { RESULTS_DEMO_NOTE } from './ResultsPanel';

describe('ResultsPanel', () => {
  it('says it is demo content that clients do not see (behaviour 2)', () => {
    const html = renderToStaticMarkup(<ResultsPanel jobDisplayId="00042" />);
    expect(RESULTS_DEMO_NOTE).toBe('Demo content — clients do not see this card.');
    expect(html).toContain(RESULTS_DEMO_NOTE);
  });
});

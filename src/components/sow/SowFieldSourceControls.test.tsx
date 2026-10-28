import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SowFieldSourceControls from './SowFieldSourceControls';
import type { SowVersionInputs } from './sowTypes';

/**
 * The Period of Performance row (design behaviours 1–2). Static markup only:
 * the repo has no interaction-test library. The picker logic itself is unit
 * tested in sowDateUtils.test.ts. MUI X renders each date as section spans, so
 * the joined text reads e.g. "End11/15/2026End" (label, sections, legend).
 */
function render(periods: SowVersionInputs['periods']): { text: string[]; html: string } {
  const html = renderToStaticMarkup(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <SowFieldSourceControls fieldKey="periodOfPerformance" inputs={{ periods } as unknown as SowVersionInputs} administrators={[]} projectLeads={[]} onChange={() => undefined} />
    </LocalizationProvider>
  );
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .split(/<[^>]+>/)
    .map((t) => t.trim())
    .filter(Boolean);
  return { text, html };
}

describe('period row', () => {
  it('shows Start, End, Days and Label in that order, with no Duration input (1)', () => {
    const { text } = render([{ startDate: '2026-11-02T00:00:00.000Z', durationDays: 14, label: 'Confocal', _dragKey: 'k1' }]);
    const at = (label: string): number => text.indexOf(label);
    expect(at('Start')).toBeGreaterThanOrEqual(0);
    expect(at('Start')).toBeLessThan(at('End'));
    expect(at('End')).toBeLessThan(at('Days'));
    expect(at('Days')).toBeLessThan(at('Label'));
    expect(text).not.toContain('Duration');
  });

  it('shows End as start + days − 1, and the day count (2, 7)', () => {
    const { text, html } = render([{ startDate: '2026-11-02T00:00:00.000Z', durationDays: 14, label: '', _dragKey: 'k1' }]);
    expect(text.join('')).toContain('Start11/02/2026Start');
    expect(text.join('')).toContain('End11/15/2026End');
    expect(html).toMatch(/value="14"/);
  });

  it('shows a legacy 0-day period as End = Start and one day (2)', () => {
    const { text, html } = render([{ startDate: '2026-11-02T00:00:00.000Z', durationDays: 0, label: '', _dragKey: 'k1' }]);
    expect(text.join('')).toContain('End11/02/2026End');
    expect(html).toMatch(/value="1"/);
  });
});

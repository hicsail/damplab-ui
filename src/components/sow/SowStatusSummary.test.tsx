import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SowStatusSummary } from './SowStatusCard';
import type { SowEditorState } from './sowTypes';

const textOf = (el: React.ReactElement): string[] =>
  renderToStaticMarkup(el)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .split(/<[^>]+>/)
    .map((t) => t.trim())
    .filter(Boolean);

const version = (versionNumber: number, status: string, displayVersion?: string): any => ({
  versionNumber,
  status,
  displayVersion
});

const sow = (over: Partial<SowEditorState> = {}): any => ({
  id: 's1',
  sowNumber: 'SOW 00086',
  activeVersionNumber: 2,
  currentVersionNumber: 2,
  versions: [],
  ...over
});

describe('SowStatusSummary', () => {
  it('leads with the status and pushes the SOW number to the reference slot', () => {
    const active = version(2, 'FINAL', '2');
    const text = textOf(<SowStatusSummary sow={sow()} active={active} current={active} hasUnsentDraft={false} />);
    expect(text[0]).toBe('Finalized');
    expect(text).toContain('SOW 00086');
    expect(text).toContain('Customer is bound by v2.');
    // The number is no longer the first thing read — that is the whole point.
    expect(text.indexOf('Finalized')).toBeLessThan(text.indexOf('SOW 00086'));
  });

  it('prefixes the version chip with v', () => {
    const active = version(2, 'FINAL', '2');
    expect(textOf(<SowStatusSummary sow={sow()} active={active} current={active} hasUnsentDraft={false} />)).toContain('v2');
  });

  it('does not repeat the status inside the chip', () => {
    const active = version(2, 'FINAL', '2');
    const text = textOf(<SowStatusSummary sow={sow()} active={active} current={active} hasUnsentDraft={false} />);
    expect(text.filter((t) => t.includes('Finalized'))).toHaveLength(1);
  });

  it('still reports an unsent draft alongside what is in force', () => {
    const active = version(2, 'FINAL', '2');
    const current = version(3, 'DRAFT', '3');
    const text = textOf(
      <SowStatusSummary sow={sow({ currentVersionNumber: 3 } as any)} active={active} current={current} hasUnsentDraft />
    );
    expect(text).toContain('Draft v3 in progress');
  });

  it('keeps the not-generated copy and shows no reference number', () => {
    const text = textOf(<SowStatusSummary sow={null} active={null} current={null} hasUnsentDraft={false} />);
    expect(text[0]).toBe('Not generated yet');
    expect(text.join(' ')).not.toMatch(/SOW \d/);
  });

  it('reports a SOW that has never been sent', () => {
    const current = version(1, 'DRAFT', '1');
    const text = textOf(<SowStatusSummary sow={sow()} active={null} current={current} hasUnsentDraft={false} />);
    expect(text[0]).toBe('Not sent yet');
    expect(text).toContain('SOW 00086');
  });
});

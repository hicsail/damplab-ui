import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalendarFeedPanel, CalendarFeedPanelProps, loadOrCreateFeed } from './CalendarFeedDialog';

const text = (el: React.ReactElement): string => renderToStaticMarkup(el).replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const noop = (): void => undefined;
const URL_ = 'https://damplab-canvas-backend.sail.codes/api/calendar/bookings/abc.ics';
const base: CalendarFeedPanelProps = { url: URL_, loading: false, error: null, copied: false, confirmingReset: false, resetting: false, onCopy: noop, onAskReset: noop, onConfirmReset: noop, onCancelReset: noop };

describe('CalendarFeedPanel', () => {
  it('shows the URL, a copy button, the refresh caveat and Reset link (9)', () => {
    const out = text(<CalendarFeedPanel {...base} />);
    expect(out).toContain(URL_);
    expect(out).toContain('refresh subscribed calendars on their own schedule');
    expect(out).toContain('often every few hours');
    expect(out).toContain('Reset link');
    expect(renderToStaticMarkup(<CalendarFeedPanel {...base} />)).toContain('aria-label="Copy calendar link"');
  });

  it('asks before resetting (11)', () => {
    const out = text(<CalendarFeedPanel {...base} confirmingReset />);
    expect(out).toContain('stop working in every calendar that subscribed to it');
    expect(out).toContain('Yes, reset');
    expect(out).toContain('Keep this link');
  });

  it('shows progress and no URL while the link is loading', () => {
    const out = renderToStaticMarkup(<CalendarFeedPanel {...base} url={null} loading />);
    expect(out).not.toContain('.ics');
    expect(out).toContain('role="progressbar"');
  });

  it('shows an error instead of a link', () => {
    expect(text(<CalendarFeedPanel {...base} url={null} error="Could not load the calendar link." />)).toContain('Could not load the calendar link.');
  });
});

describe('loadOrCreateFeed (10)', () => {
  const link = { url: 'u1', createdAt: '2026-10-27T12:00:00Z' };
  it('shows the existing link without creating one', async () => {
    const create = vi.fn(async () => ({ url: 'u2', createdAt: 'c' }));
    expect(await loadOrCreateFeed(async () => link, create)).toEqual(link);
    expect(create).not.toHaveBeenCalled();
  });
  it('creates the link the first time', async () => {
    const create = vi.fn(async () => ({ url: 'u2', createdAt: 'c' }));
    expect(await loadOrCreateFeed(async () => null, create)).toEqual({ url: 'u2', createdAt: 'c' });
    expect(create).toHaveBeenCalledTimes(1);
  });
});

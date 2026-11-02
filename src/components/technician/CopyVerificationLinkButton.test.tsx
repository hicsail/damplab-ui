import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CopyVerificationLinkButton, { COPY_VERIFICATION_LINK } from './CopyVerificationLinkButton';
import { copyVerificationLink } from './copyVerificationLink';

const html = (el: React.ReactElement): string => renderToStaticMarkup(el).replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');

describe('Copy verification link button', () => {
  it('renders with the one label, enabled once the job has an Aclid screen', () => {
    const markup = html(<CopyVerificationLinkButton hasScreen mint={async () => 'https://x'} />);
    expect(COPY_VERIFICATION_LINK).toBe('Copy verification link');
    expect(markup).toContain('Copy verification link');
    expect(markup).not.toContain('disabled');
  });

  it('is disabled with a "Run screening first" tooltip while the job has no Aclid screen', () => {
    const markup = html(<CopyVerificationLinkButton hasScreen={false} mint={async () => 'https://x'} />);
    expect(markup).toContain('Copy verification link');
    expect(markup).toMatch(/<button[^>]*disabled/);
    expect(markup).toContain('Run screening first');
  });
});

describe('copyVerificationLink', () => {
  it('copies the URL the mutation returned', async () => {
    const writeText = vi.fn(async () => undefined);
    const outcome = await copyVerificationLink(async () => 'https://verify.aclid.bio/s/abc', writeText);
    expect(writeText).toHaveBeenCalledWith('https://verify.aclid.bio/s/abc');
    expect(outcome).toEqual({ kind: 'copied' });
  });

  it('falls back to showing the URL when the clipboard write is refused', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('NotAllowedError');
    });
    const outcome = await copyVerificationLink(async () => 'https://verify.aclid.bio/s/abc', writeText);
    expect(outcome).toEqual({ kind: 'manual', url: 'https://verify.aclid.bio/s/abc' });
  });

  it('falls back to showing the URL when there is no clipboard at all', async () => {
    const outcome = await copyVerificationLink(async () => 'https://verify.aclid.bio/s/abc', undefined);
    expect(outcome).toEqual({ kind: 'manual', url: 'https://verify.aclid.bio/s/abc' });
  });

  it('reports the server error text and never touches the clipboard', async () => {
    const writeText = vi.fn();
    const outcome = await copyVerificationLink(async () => {
      throw new Error('No Aclid screen on this job');
    }, writeText);
    expect(outcome).toEqual({ kind: 'error', message: 'No Aclid screen on this job' });
    expect(writeText).not.toHaveBeenCalled();
  });
});

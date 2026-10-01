import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JobDescription from './JobDescription';
import JobPeopleLine from './JobPeopleLine';
import { JobMembersList } from './ManageJobMembersDialog';

const text = (el: React.ReactElement): string => renderToStaticMarkup(el).replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const html = (el: React.ReactElement): string => renderToStaticMarkup(el);
const noop = async (): Promise<void> => undefined;

describe('JobDescription (B16)', () => {
  it('shows the text with an edit control when set', () => {
    const out = html(<JobDescription description="Plasmid prep for lab 4" canEdit onSave={noop} />);
    expect(text(<JobDescription description="Plasmid prep for lab 4" canEdit onSave={noop} />)).toContain('Plasmid prep for lab 4');
    expect(out).toContain('aria-label="Edit description"');
  });
  it('offers "Add a description" when unset', () => {
    expect(text(<JobDescription description={null} canEdit onSave={noop} />)).toContain('Add a description');
  });
  it('shows no edit control and no prompt to someone who cannot edit', () => {
    expect(html(<JobDescription description="x" canEdit={false} onSave={noop} />)).not.toContain('aria-label="Edit description"');
    expect(text(<JobDescription description={null} canEdit={false} onSave={noop} />)).toBe('');
  });
});

describe('JobPeopleLine (B26)', () => {
  it('names the primary, then the members, with Manage for someone who may manage', () => {
    const out = text(<JobPeopleLine primaryEmail="client@bu.edu" memberEmails={['a@x.org', 'b@x.org']} canManage onManage={() => undefined} />);
    expect(out).toContain('Primary: client@bu.edu');
    expect(out).toContain('a@x.org, b@x.org');
    expect(out).toContain('Manage');
  });
  it('hides Manage otherwise', () => {
    expect(text(<JobPeopleLine primaryEmail="client@bu.edu" memberEmails={[]} canManage={false} onManage={() => undefined} />)).not.toContain('Manage');
  });
});

describe('JobMembersList', () => {
  it('offers removal for members but never for the primary', () => {
    const out = html(<JobMembersList primaryEmail="client@bu.edu" memberEmails={['a@x.org']} onRemove={noop} busyEmail={null} />);
    expect(out).toContain('aria-label="Remove a@x.org"');
    expect(out).not.toContain('aria-label="Remove client@bu.edu"');
  });
});

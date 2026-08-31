import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Chip } from '@mui/material';
import StatusPaneHeader from './StatusPaneHeader';

/** Visible text in document order, which is what "status left, reference right" means here. */
const textOf = (el: React.ReactElement): string[] =>
  renderToStaticMarkup(el)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .split(/<[^>]+>/)
    .map((t) => t.trim())
    .filter(Boolean);

describe('StatusPaneHeader', () => {
  it('leads with the status and puts the reference last on the top row', () => {
    const text = textOf(
      <StatusPaneHeader
        status="Accepted"
        chips={<Chip size="small" label="v2" />}
        reference={<><b>Job ID:</b> 00042</>}
        description="The job was accepted by the DAMP Lab."
      />
    );
    expect(text).toEqual(['Accepted', 'v2', 'Job ID:', '00042', 'The job was accepted by the DAMP Lab.']);
  });

  it('omits the reference row entirely when there is no reference number', () => {
    const text = textOf(
      <StatusPaneHeader status="Not generated yet" description="Generate a Statement of Work…" />
    );
    expect(text).toEqual(['Not generated yet', 'Generate a Statement of Work…']);
  });

  it('renders a status on its own', () => {
    expect(textOf(<StatusPaneHeader status="Job not loaded" />)).toEqual(['Job not loaded']);
  });

  it('renders children below the description', () => {
    const text = textOf(
      <StatusPaneHeader status="Not Started" description="Screening has not run.">
        <Chip size="small" label="Metadata: Not Started" />
      </StatusPaneHeader>
    );
    expect(text).toEqual(['Not Started', 'Screening has not run.', 'Metadata: Not Started']);
  });
});

describe('Invoices pane shape', () => {
  it('does not print the invoice number twice', () => {
    // Regression: the number lives in the reference slot; the description
    // used to repeat it as "Latest INV-2".
    const text = textOf(
      <StatusPaneHeader status="2 invoices" reference="INV-2" description="Latest invoice · $1234.00" />
    );
    expect(text.filter((t) => t.includes('INV-2'))).toHaveLength(1);
  });
});

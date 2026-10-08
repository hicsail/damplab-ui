import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JobWorkflowCards, { formatParameterValue, getParameterFiles, getSampleSheets } from './JobWorkflowCards';

const text = (el: React.ReactElement): string => renderToStaticMarkup(el).replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('JobWorkflowCards — parameter snapshot fallback (B22)', () => {
  const workflows = [{
    id: 'w1', name: 'Workflow', state: 'QUEUED',
    nodes: [{
      id: 'a', label: 'Gibson', state: 'QUEUED',
      service: { id: 'svc', parameters: [{ id: 'vol', name: 'Volume', type: 'number' }] },
      formData: [{ id: 'vol', value: 10 }, { id: 'gone', value: 'raw-id-7' }, { id: '__runCount', value: 2 }],
      parameterSnapshot: [{ id: 'gone', name: 'Old parameter', type: 'dropdown', displayValue: 'Plasmid' }]
    }]
  }];

  it('labels a removed parameter from the snapshot, and leaves live and reserved ones alone', () => {
    const out = text(<JobWorkflowCards workflows={workflows} />);
    expect(out).toContain('Old parameter: Plasmid');
    expect(out).not.toContain('raw-id-7');
    expect(out).toContain('Volume: 10');
    expect(out).toContain('Number of runs: 2');
  });

  it('leaves out the retired booker list an old job still stores (F1)', () => {
    const withBookers = [{ ...workflows[0], nodes: [{ ...workflows[0].nodes[0], formData: [{ id: 'vol', value: 10 }, { id: '__equipBookers', value: ['old@x.org'] }] }] }];
    const out = text(<JobWorkflowCards workflows={withBookers} />);
    expect(out).toContain('Volume: 10');
    expect(out).not.toContain('old@x.org');
    expect(out).not.toContain('Authorized booker emails');
  });
});

describe('JobWorkflowCards — "Other" (rule 28)', () => {
  const sampleType = { id: 'sample_type', name: 'Sample Type', type: 'dropdown', options: [{ id: 'bact', name: 'Bacteria' }, { id: 'oth', name: 'Other' }] };
  const workflows = [{
    id: 'w1', name: 'Workflow', state: 'QUEUED',
    nodes: [{
      id: 'a', label: 'Extraction', state: 'QUEUED',
      service: { id: 'svc', parameters: [sampleType] },
      formData: [{ id: 'sample_type', value: ['bact', 'oth'] }, { id: 'sample_type__otherText', value: 'Yeast' }],
      parameterSnapshot: [{ id: 'sample_type', name: 'Sample Type', type: 'dropdown', displayValue: 'Bacteria, Other: Yeast' }]
    }]
  }];

  it('reads "Other: <text>" and does not list the text entry as a parameter', () => {
    const out = text(<JobWorkflowCards workflows={workflows} />);
    expect(out).toContain('Sample Type: Bacteria, Other: Yeast');
    expect(out).not.toContain('sample_type__otherText');
    expect(out).not.toContain('Parameter: Yeast');
  });

  it('formats a single answer, and leaves a plain option alone', () => {
    expect(formatParameterValue(sampleType, 'oth', 'Yeast')).toBe('Other: Yeast');
    expect(formatParameterValue(sampleType, 'oth')).toBe('Other');
    expect(formatParameterValue(sampleType, 'bact', 'Yeast')).toBe('Bacteria');
  });
});

describe('JobWorkflowCards — hidden parameters (show-only-if rule 21)', () => {
  const sample = { id: 'sample', name: 'Sample Type', type: 'dropdown', options: [{ id: 'bact', name: 'Bacteria' }, { id: 'yeast', name: 'Yeast' }] };
  const isBacteria = { parameterId: 'sample', op: 'eq', optionIds: ['bact'] };
  const lysis = { id: 'lysis', name: 'Lysis', type: 'dropdown', showIf: isBacteria, options: [{ id: 'enz', name: 'Enzymatic' }, { id: 'oth', name: 'Other' }] };
  const map = { id: 'map', name: 'Plasmid map', type: 'file', showIf: isBacteria };
  const sheet = { id: 'sheet', name: 'Samples', type: 'sampleSheet', showIf: isBacteria };
  const workflowsFor = (sampleValue: string): any[] => [{
    id: 'w1', name: 'Workflow', state: 'QUEUED',
    nodes: [{
      _id: 'db1', id: 'a', label: 'Extraction', state: 'QUEUED',
      service: { id: 'svc', parameters: [sample, lysis, map, sheet] },
      formData: [
        { id: 'sample', value: sampleValue },
        { id: 'lysis', value: 'oth' },
        { id: 'lysis__otherText', value: 'Bead beating' },
        { id: 'map', value: JSON.stringify({ filename: 'pUC19.gb', key: 'k' }) }
      ]
    }]
  }];

  it('lists a conditional answer while its condition holds', () => {
    const out = text(<JobWorkflowCards workflows={workflowsFor('bact')} />);
    expect(out).toContain('Sample Type: Bacteria');
    expect(out).toContain('Lysis: Other: Bead beating');
  });

  it('omits a hidden parameter even when its answer is still stored', () => {
    const out = text(<JobWorkflowCards workflows={workflowsFor('yeast')} />);
    expect(out).toContain('Sample Type: Yeast');
    expect(out).not.toContain('Lysis');
    expect(out).not.toContain('Bead beating');
    expect(out).not.toContain('Plasmid map');
  });

  it('getParameterFiles leaves out a file answered for a hidden parameter', () => {
    expect(getParameterFiles(workflowsFor('bact')).map((f) => f.filename)).toEqual(['pUC19.gb']);
    expect(getParameterFiles(workflowsFor('yeast'))).toEqual([]);
  });

  it('getSampleSheets offers no slot for a hidden samples-spreadsheet parameter', () => {
    expect(getSampleSheets(workflowsFor('bact')).map((s) => s.parameterId)).toEqual(['sheet']);
    expect(getSampleSheets(workflowsFor('yeast'))).toEqual([]);
  });
});

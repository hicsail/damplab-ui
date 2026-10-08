import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Params from './Params';
import { CanvasContext } from '../contexts/Canvas';

const options = [{ id: 'bact', name: 'Bacteria' }, { id: 'oth', name: 'Other' }];
const parameters = [
  { id: 'tags', name: 'Sample Types', type: 'dropdown', allowMultipleValues: true, display: 'checkboxes', options },
  { id: 'kind', name: 'Kind', type: 'dropdown', options },
  { id: 'cycles', name: 'Cycles', type: 'number', validation: '>0' }
];
const entry = (id: string, value: unknown): any => {
  const def: any = parameters.find((p) => p.id === id);
  return { id, nodeId: 'n1', name: def.name, type: def.type, options: def.options ?? null, paramType: 'input', value, required: false, allowMultipleValues: def.allowMultipleValues || undefined };
};
const node = (formData: any[]): any => ({ id: 'n1', data: { id: 'n1', serviceId: 's1', parameters, formData } });

const html = (formData: any[]): string =>
  renderToStaticMarkup(
    <CanvasContext.Provider value={{ setNodes: () => {} } as any}>
      <Params activeNode={node(formData)} />
    </CanvasContext.Provider>
  );
const text = (markup: string): string => markup.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('Params — checkbox list (rule 30)', () => {
  it('renders every option as a tick-box under the parameter name, ticked from the saved ids', () => {
    const markup = html([entry('tags', ['bact'])]);
    expect(text(markup)).toContain('Sample Types');
    expect(text(markup)).toContain('Bacteria');
    expect(text(markup)).toContain('Other');
    expect((markup.match(/type="checkbox"/g) ?? []).length).toBe(2);
    expect((markup.match(/checked=""/g) ?? []).length).toBe(1);
  });
});

describe('Params — "Other" (rule 27)', () => {
  it('shows "Please specify" only while Other is selected, and does not draw the text entry as a field of its own', () => {
    const selected = html([entry('kind', 'oth'), { id: 'kind__otherText', nodeId: 'n1', name: 'Kind (Other)', type: 'string', paramType: 'input', value: 'Yeast', required: false }]);
    expect(text(selected)).toContain('Please specify');
    expect(selected).toContain('value="Yeast"');
    expect((selected.match(/Kind \(Other\)/g) ?? []).length).toBe(0);

    expect(text(html([entry('kind', 'bact')]))).not.toContain('Please specify');
  });

  it('shows it under a checkbox list too', () => {
    expect(text(html([entry('tags', ['oth'])]))).toContain('Please specify');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Params from './Params';
import { CanvasContext } from '../contexts/Canvas';

// There is no DOM here, so effects never run on their own. Params' effects are collected so a test can run them,
// and formik's setValues is observed (the real useFormik still supplies the values). Everything else is untouched.
const spy = vi.hoisted(() => ({ effects: [] as Array<() => void>, setValues: vi.fn() }));
vi.mock('react', async (importOriginal) => {
  const actual: any = await importOriginal();
  const useEffect = (effect: () => void): void => {
    spy.effects.push(effect);
  };
  return { ...actual, default: { ...actual, useEffect }, useEffect };
});
vi.mock('formik', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, useFormik: (config: any) => ({ ...actual.useFormik(config), setValues: spy.setValues }) };
});

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

describe('Params — "show only if" (show-only-if rule 14)', () => {
  const kinds = [{ id: 'bact', name: 'Bacteria' }, { id: 'yeast', name: 'Yeast' }];
  const isBacteria = { parameterId: 'kind', op: 'eq', optionIds: ['bact'] };
  // A set parameter cannot name an operation's own parameter, so the Extraction set is controlled by the Sample set.
  const organismIsBacteria = { parameterId: 'organism', parameterSetId: 'set0', op: 'eq', optionIds: ['bact'] };
  const conditional = [
    { id: 'kind', name: 'Kind', type: 'dropdown', options: kinds },
    { id: 'lysis', name: 'Lysis method', type: 'dropdown', options, showIf: isBacteria },
    { id: 'organism', name: 'Organism', type: 'dropdown', options: kinds, fromParameterSetId: 'set0', fromParameterSetName: 'Sample' },
    { id: 'buffer', name: 'Buffer', type: 'string', fromParameterSetId: 'set1', fromParameterSetName: 'Extraction', showIf: organismIsBacteria },
    { id: 'elution', name: 'Elution', type: 'string', fromParameterSetId: 'set1', fromParameterSetName: 'Extraction', showIf: organismIsBacteria },
    { id: 'notes', name: 'Free notes', type: 'string', fromParameterSetId: 'set2', fromParameterSetName: 'Paperwork' }
  ];
  const entryOf = (id: string, value: unknown): any => {
    const def: any = conditional.find((p) => p.id === id);
    return { id, nodeId: 'n1', name: def.name, type: def.type, options: def.options ?? null, paramType: 'input', value, required: true };
  };
  const otherText = { id: 'lysis__otherText', nodeId: 'n1', name: 'Lysis method (Other)', type: 'string', paramType: 'input', value: 'Beads', required: false };
  const render = (kind: string): string =>
    text(
      renderToStaticMarkup(
        <CanvasContext.Provider value={{ setNodes: () => {} } as any}>
          <Params
            activeNode={{
              id: 'n1',
              data: {
                id: 'n1',
                serviceId: 's1',
                parameters: conditional,
                formData: [entryOf('kind', kind), entryOf('lysis', 'oth'), otherText, entryOf('organism', kind), entryOf('buffer', 'TE'), entryOf('elution', ''), entryOf('notes', '')]
              }
            }}
          />
        </CanvasContext.Provider>
      )
    );

  it('renders a conditional parameter, its "Other" text and its set heading while the condition holds', () => {
    const shown = render('bact');
    expect(shown).toContain('Lysis method');
    expect(shown).toContain('Please specify');
    expect(shown).toContain('Extraction');
    expect(shown).toContain('Buffer');
    expect(shown).toContain('Elution');
  });

  it('does not render a hidden parameter, nor its "Other" text', () => {
    const hidden = render('yeast');
    expect(hidden).toContain('Kind');
    expect(hidden).not.toContain('Lysis method');
    expect(hidden).not.toContain('Please specify');
    expect(hidden).not.toContain('Buffer');
    expect(hidden).not.toContain('Elution');
  });

  it('does not render a set heading with no visible parameter under it, and keeps the others', () => {
    const hidden = render('yeast');
    expect(hidden).not.toContain('Extraction');
    expect(hidden).toContain('Sample');
    expect(hidden).toContain('Paperwork');
    expect(hidden).toContain('Free notes');
  });
});

describe('Params — rule 15 through the form (show-only-if)', () => {
  const kinds = [{ id: 'bact', name: 'Bacteria' }, { id: 'yeast', name: 'Yeast' }];
  const defs = [
    { id: 'kind', name: 'Kind', type: 'dropdown', options: kinds },
    { id: 'lysis', name: 'Lysis method', type: 'string', showIf: { parameterId: 'kind', op: 'eq', optionIds: ['bact'] } }
  ];
  const row = (id: string, value: unknown): any => ({ id, nodeId: 'n1', name: id, type: defs.find((d) => d.id === id)!.type, options: id === 'kind' ? kinds : null, paramType: 'input', value, required: false });
  const setNodes = vi.fn();

  /** Render the form for a node holding `formData`, then run the effects that render registered (what a browser does after paint). */
  const mount = (formData: any[]): void => {
    spy.effects.length = 0;
    renderToStaticMarkup(
      <CanvasContext.Provider value={{ setNodes } as any}>
        <Params activeNode={{ id: 'n1', data: { id: 'n1', serviceId: 's1', parameters: defs, formData } }} />
      </CanvasContext.Provider>
    );
    spy.effects.forEach((effect) => effect());
  };
  const savedFormData = (): any[] => {
    const updater = setNodes.mock.calls.at(-1)![0];
    return updater([{ id: 'n1', data: { formData: [] } }])[0].data.formData;
  };

  beforeEach(() => {
    spy.setValues.mockClear();
    setNodes.mockClear();
  });

  it('empties the answer of a parameter an answer change has just hidden, and then settles (no loop)', () => {
    // The answer was changed from Bacteria to Yeast; "Lysis method" still holds its text.
    mount([row('kind', 'yeast'), row('lysis', 'beads')]);
    expect(spy.setValues).toHaveBeenCalledTimes(1);
    expect(spy.setValues).toHaveBeenCalledWith({ kind: 'yeast', lysis: '' });
    // Nothing is written back while a reset is pending: the form re-renders with the emptied values first.
    expect(setNodes).not.toHaveBeenCalled();

    // The form re-renders with those values: nothing is left to reset, so the effect saves and stops.
    spy.setValues.mockClear();
    mount([row('kind', 'yeast'), row('lysis', '')]);
    expect(spy.setValues).not.toHaveBeenCalled();
    expect(setNodes).toHaveBeenCalledTimes(1);
    expect(savedFormData().find((e) => e.id === 'lysis').value).toBe('');
  });

  it('leaves a shown parameter alone', () => {
    mount([row('kind', 'bact'), row('lysis', 'beads')]);
    expect(spy.setValues).not.toHaveBeenCalled();
    expect(savedFormData().find((e) => e.id === 'lysis').value).toBe('beads');
  });
});

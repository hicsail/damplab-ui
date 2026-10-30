import { describe, expect, it } from 'vitest';
import { missingParamFiles, pickedParamFiles } from './missingParamFiles';
import { answerProblems, nodeAnswersComplete } from './parameterAnswers';

const live = (name: string) => ({ __kind: 'pending-file', localId: name, file: new File(['x'], name), filename: name, contentType: 'text/plain', size: 1 });
// What a picked file becomes once the canvas has been through JSON.
const lost = (name: string) => JSON.parse(JSON.stringify(live(name)));

const node = (entry: Record<string, unknown>, definition: Record<string, unknown> = {}) => {
  const param = { id: 'p', name: 'Vector', type: 'file', ...entry };
  return { id: 'n1', data: { label: 'Gibson', parameters: [{ ...param, ...definition }], formData: [param] } };
};

describe('missingParamFiles', () => {
  it('names a lost file on an optional parameter as well as a required one', () => {
    expect(missingParamFiles([node({ value: lost('a.fa') })])).toEqual([{ operation: 'Gibson', parameter: 'Vector', filename: 'a.fa' }]);
    expect(missingParamFiles([node({ required: true, value: lost('a.fa') })])).toEqual([{ operation: 'Gibson', parameter: 'Vector', filename: 'a.fa' }]);
  });

  it('names each lost file of a list, and keeps the ones still held', () => {
    expect(missingParamFiles([node({ value: [live('keep.fa'), lost('a.fa'), lost('b.fa')] })]).map((m) => m.filename)).toEqual(['a.fa', 'b.fa']);
  });

  it('reports a required file parameter with nothing in it', () => {
    for (const value of [null, undefined, '', []]) {
      expect(missingParamFiles([node({ required: true, value })])).toEqual([{ operation: 'Gibson', parameter: 'Vector' }]);
    }
  });

  it('passes a held file, a file already stored, an optional parameter left empty, and a required non-file answer', () => {
    expect(missingParamFiles([node({ required: true, value: live('a.fa') })])).toEqual([]);
    expect(missingParamFiles([node({ required: true, value: '{"filename":"a.fa","key":"k"}' })])).toEqual([]);
    expect(missingParamFiles([node({ value: null })])).toEqual([]);
    expect(missingParamFiles([node({ required: true, type: 'string', value: null })])).toEqual([]);
  });

  it('requires a Table that is set up, and never one that cannot be answered', () => {
    expect(missingParamFiles([node({ required: true, type: 'table', value: null }, { tableData: { columns: [{ header: 'Name' }] } })])).toHaveLength(1);
    expect(missingParamFiles([node({ required: true, type: 'table', value: null })])).toEqual([]);
  });

  it('ignores a hidden parameter', () => {
    const parameters = [
      { id: 'kind', name: 'Kind', type: 'dropdown', options: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] },
      { id: 'p', name: 'Vector', type: 'file', required: true, showIf: { parameterId: 'kind', op: 'eq', optionIds: ['a'] } },
    ];
    const withKind = (kind: string) => ({ data: { label: 'Gibson', parameters, formData: [{ id: 'kind', type: 'dropdown', value: kind }, { id: 'p', type: 'file', required: true, value: lost('a.fa') }] } });
    expect(missingParamFiles([withKind('b')])).toEqual([]);
    expect(missingParamFiles([withKind('a')])).toHaveLength(1);
  });
});

describe('pickedParamFiles', () => {
  it('lists every picked file a save will not keep, held or already lost, and nothing else', () => {
    const value = [live('a.fa'), lost('b.fa'), '{"filename":"stored.fa","key":"k"}'];
    expect(pickedParamFiles([node({ value })]).map((f) => f.filename)).toEqual(['a.fa', 'b.fa']);
    expect(pickedParamFiles([node({ value: null })])).toEqual([]);
  });
});

describe('a lost file on the form and the badge', () => {
  it('is a problem, and marks the node incomplete, even on an optional parameter', () => {
    const n = node({ value: lost('a.fa') });
    expect(answerProblems(n.data.formData, n.data.parameters).p).toContain('Upload it again');
    expect(nodeAnswersComplete(n.data.formData, n.data.parameters)).toBe(false);
  });

  it('is not a problem once the file is held again', () => {
    const n = node({ value: live('a.fa') });
    expect(answerProblems(n.data.formData, n.data.parameters)).toEqual({});
    expect(nodeAnswersComplete(n.data.formData, n.data.parameters)).toBe(true);
  });
});

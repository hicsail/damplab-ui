import { describe, expect, it } from 'vitest';
import { conditionFromText, conditionText, ConditionScope, effectiveScope, missingReferences, parseCondition, resolveCondition, sameConditionText } from './parameterConditionText';

const tree = (text: string): any => {
  const parsed = parseCondition(text);
  if ('error' in parsed) throw new Error(parsed.error);
  return parsed.tree;
};
const syntaxError = (text: string): string => {
  const parsed = parseCondition(text);
  return 'error' in parsed ? parsed.error : 'no error';
};

describe('parseCondition — grammar (rules 1–3)', () => {
  it('reads a comparison: reference, operator, value', () => {
    expect(tree('"Sample Type"=="Bacteria"')).toEqual({ ref: { name: 'Sample Type' }, op: 'eq', value: 'Bacteria' });
    expect(tree('"Volume" >= 2.5')).toEqual({ ref: { name: 'Volume' }, op: 'ge', value: 2.5 });
    expect(tree('"Volume"<-1')).toEqual({ ref: { name: 'Volume' }, op: 'lt', value: -1 });
    expect(tree('"Hot start"!=TRUE')).toEqual({ ref: { name: 'Hot start' }, op: 'ne', value: true });
    expect(tree('"Hot start"==false')).toEqual({ ref: { name: 'Hot start' }, op: 'eq', value: false });
  });

  it('reads every operator', () => {
    expect(['==', '!=', '>', '>=', '<', '<='].map((op) => tree(`"A"${op}1`).op)).toEqual(['eq', 'ne', 'gt', 'ge', 'lt', 'le']);
    expect(tree('"A" in ("x", "y",3)')).toEqual({ ref: { name: 'A' }, op: 'in', values: ['x', 'y', 3] });
    expect(tree('"A".includes("rush")')).toEqual({ ref: { name: 'A' }, op: 'includes', value: 'rush' });
  });

  it('reads a qualified reference, with every operator form', () => {
    expect(tree('"Nucleic Acid Extraction"."Sample Type"=="Bacteria"')).toEqual({ ref: { set: 'Nucleic Acid Extraction', name: 'Sample Type' }, op: 'eq', value: 'Bacteria' });
    expect(tree('"Set"."P".includes("x")')).toEqual({ ref: { set: 'Set', name: 'P' }, op: 'includes', value: 'x' });
    expect(tree('"Set" . "P" in ("x")')).toEqual({ ref: { set: 'Set', name: 'P' }, op: 'in', values: ['x'] });
  });

  it('&& binds tighter than ||; parentheses group', () => {
    const a = { ref: { name: 'A' }, op: 'eq', value: 1 };
    const b = { ref: { name: 'B' }, op: 'eq', value: 2 };
    const c = { ref: { name: 'C' }, op: 'eq', value: 3 };
    expect(tree('"A"==1 || "B"==2 && "C"==3')).toEqual({ any: [a, { all: [b, c] }] });
    expect(tree('("A"==1 || "B"==2) && "C"==3')).toEqual({ all: [{ any: [a, b] }, c] });
    expect(tree('"A"==1 && "B"==2 && "C"==3')).toEqual({ all: [a, b, c] });
    expect(tree('(("A"==1))')).toEqual(a);
  });

  it('reads curly quotes as straight quotes, single quotes as quotes, and \\" inside a name', () => {
    expect(tree('“Sample Type”==‘Bacteria’')).toEqual({ ref: { name: 'Sample Type' }, op: 'eq', value: 'Bacteria' });
    expect(tree('"5\\" plate"=="x"')).toEqual({ ref: { name: '5" plate' }, op: 'eq', value: 'x' });
  });

  it('ignores whitespace outside quotes and keeps it inside', () => {
    expect(tree('  "A  b"\n ==\t"x  y" ')).toEqual({ ref: { name: 'A  b' }, op: 'eq', value: 'x  y' });
  });

  it.each([
    ['', 'The condition is empty.'],
    ['   ', 'The condition is empty.'],
    ['Enzyme used depends on template', 'Expected a quoted parameter name but found “Enzyme”.'],
    ['"A"', 'Expected ==, !=, >, >=, <, <=, in or .includes but found the end.'],
    ['"A"==', 'Expected a quoted value, a number, true or false but found the end.'],
    ['"A"=="x" &&', 'Expected a quoted parameter name but found the end.'],
    ['"A"=="x" "B"=="y"', 'Expected && or || but found “B”.'],
    ['("A"=="x"', 'Expected “)” but found the end.'],
    ['"A"=="x', 'A quote opened at character 6 is never closed.'],
    ['"A" = "x"', 'Unexpected “=” at character 5.'],
    ['"A" in "x"', 'Expected “(” but found “x”.'],
    ['"A" in ()', 'Expected a quoted value, a number, true or false but found “)”.'],
    ['"A" in (true)', '“in” takes quoted values, not true or false.'],
    ['"A".contains("x")', 'Expected “includes” but found “contains”.'],
    ['"A".includes(5)', 'Expected quoted text but found “5”.'],
    ['"A"==yes', 'Expected a quoted value, a number, true or false but found “yes”.']
  ])('syntax error: %s', (text, message) => {
    expect(syntaxError(text)).toBe(message);
  });
});

describe('sameConditionText (rule 26)', () => {
  it('ignores whitespace outside quotes and quote style', () => {
    expect(sameConditionText('"A"=="x" && "B">5', '“A” == ‘x’&&"B" > 5')).toBe(true);
    expect(sameConditionText('"A"=="x y"', '"A"=="x  y"')).toBe(false);
    expect(sameConditionText('"A"=="x"', '"a"=="x"')).toBe(false);
    expect(sameConditionText('', '   ')).toBe(true);
  });
  it('falls back to the trimmed text for something that is not a condition', () => {
    expect(sameConditionText('a note = b', ' a note = b ')).toBe(true);
    expect(sameConditionText('a note = b', 'another note = b')).toBe(false);
  });
});

// ------------------------------------------------------------------ resolving

const SAMPLE = { id: 'sample', name: 'Sample Type', type: 'dropdown', options: [{ id: 'bact', name: 'Bacteria' }, { id: 'yeast', name: 'Yeast cells' }] };
const TAGS = { id: 'tags', name: 'Tags', type: 'dropdown', allowMultipleValues: true, display: 'checkboxes', options: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }] };
const HOT = { id: 'hot', name: 'Hot start', type: 'boolean' };
const VOLUME = { id: 'volume', name: 'Volume', type: 'number' };
const NOTE = { id: 'note', name: 'Notes', type: 'string' };
const KIT = { id: 'kit', name: 'Kit', type: 'string' };
const EXTRACTION = { id: 'set1', name: 'Nucleic Acid Extraction', parameters: [SAMPLE, TAGS, HOT, VOLUME, NOTE, KIT] };
const CLEANUP = { id: 'set2', name: 'Cleanup', parameters: [{ id: 'method', name: 'Method', type: 'dropdown', options: [{ id: 'col', name: 'Column' }] }, { id: 'layout', name: 'Layout', type: 'table' }] };
const sets = [EXTRACTION, CLEANUP];
/** KIT, in the Extraction set. */
const inSet: ConditionScope = { list: EXTRACTION.parameters, carrierIndex: 5, setId: 'set1', sets };
/** An operation's own parameter. */
const own = [{ id: 'cycles', name: 'Cycles', type: 'number' }, { id: 'polymerase', name: 'Polymerase', type: 'string' }, { id: 'upload', name: 'Upload', type: 'file' }, { id: 'sheet', name: 'Samples', type: 'sampleSheet' }];
const onOperation: ConditionScope = { list: own, carrierIndex: 1, sets };

const resolved = (text: string, scope: ConditionScope = inSet): any => {
  const out = conditionFromText(text, scope);
  if ('error' in out) throw new Error(out.error);
  return out.condition;
};
const problem = (text: string, scope: ConditionScope = inSet): string => {
  const out = conditionFromText(text, scope);
  return 'error' in out ? out.error : 'no error';
};

describe('resolveCondition — references (rule 5)', () => {
  it('an unqualified reference is a parameter of the carrier’s own list', () => {
    expect(resolved('"Sample Type"=="Bacteria"')).toEqual({ parameterId: 'sample', op: 'eq', optionIds: ['bact'] });
    expect(resolved('"Cycles">5', onOperation)).toEqual({ parameterId: 'cycles', op: 'gt', value: 5 });
  });

  it('a qualified reference is a parameter of the named set, and carries its id', () => {
    expect(resolved('"Nucleic Acid Extraction"."Sample Type"=="Bacteria"', onOperation)).toEqual({ parameterId: 'sample', parameterSetId: 'set1', op: 'eq', optionIds: ['bact'] });
    expect(resolved('"Cleanup"."Method"=="Column"')).toEqual({ parameterId: 'method', parameterSetId: 'set2', op: 'eq', optionIds: ['col'] });
  });

  it('naming the carrier’s own set is the same as not naming it', () => {
    expect(resolved('"Nucleic Acid Extraction"."Sample Type"=="Bacteria"')).toEqual({ parameterId: 'sample', op: 'eq', optionIds: ['bact'] });
  });

  it('matches names trimmed and case-insensitively (rule 4)', () => {
    expect(resolved(' "nucleic acid EXTRACTION" . " sample type " == "bacteria" ', onOperation)).toEqual({ parameterId: 'sample', parameterSetId: 'set1', op: 'eq', optionIds: ['bact'] });
  });

  it('a set parameter cannot name an operation’s own parameter: only its set is searched', () => {
    expect(problem('"Cycles">5')).toBe('No parameter is named “Cycles” here.');
  });

  it('goes from text to nothing for a blank field', () => {
    expect(conditionFromText('  ', inSet)).toEqual({ condition: undefined });
  });
});

describe('resolveCondition — what is stored (rule 7)', () => {
  it('dropdown ==, != and in are option ids; .includes is text', () => {
    expect(resolved('"Sample Type"!="Yeast cells"')).toEqual({ parameterId: 'sample', op: 'ne', optionIds: ['yeast'] });
    expect(resolved('"Tags" in ("Alpha","beta")')).toEqual({ parameterId: 'tags', op: 'in', optionIds: ['a', 'b'] });
    expect(resolved('"Sample Type".includes("cell")')).toEqual({ parameterId: 'sample', op: 'includes', value: 'cell' });
  });

  it('yes/no, number and text keep their value', () => {
    expect(resolved('"Hot start"==true')).toEqual({ parameterId: 'hot', op: 'eq', value: true });
    expect(resolved('"Volume"<="10"')).toEqual({ parameterId: 'volume', op: 'le', value: 10 });
    expect(resolved('"Volume"==5')).toEqual({ parameterId: 'volume', op: 'eq', value: 5 });
    expect(resolved('"Notes"=="Rush"')).toEqual({ parameterId: 'note', op: 'eq', value: 'Rush' });
    expect(resolved('"Notes" in ("a",2)')).toEqual({ parameterId: 'note', op: 'in', values: ['a', '2'] });
    expect(resolved('"Notes".includes("rush")')).toEqual({ parameterId: 'note', op: 'includes', value: 'rush' });
  });

  it('keeps && / || structure, with keys in a fixed order', () => {
    const condition = resolved('"Sample Type"=="Bacteria" && ("Volume">5 || "Cleanup"."Method"=="Column")');
    expect(JSON.stringify(condition)).toBe(
      '{"all":[{"parameterId":"sample","op":"eq","optionIds":["bact"]},{"any":[{"parameterId":"volume","op":"gt","value":5},{"parameterId":"method","parameterSetId":"set2","op":"eq","optionIds":["col"]}]}]}'
    );
  });
});

describe('resolveCondition — errors name the offending part (rule 6)', () => {
  it.each([
    ['unknown set', '"Buffers"."Volume">5', 'No parameter set is named “Buffers”.'],
    ['unknown parameter in a named set', '"Cleanup"."Volume">5', 'No parameter is named “Volume” in “Cleanup”.'],
    ['unknown parameter here', '"Elution">5', 'No parameter is named “Elution” here.'],
    ['a parameter referring to itself', '"Kit"=="x"', 'A parameter cannot depend on itself.'],
    ['a table controller', '"Cleanup"."Layout"=="x"', '“Layout” is a Table parameter and cannot control a condition.'],
    ['> against a non-number parameter', '"Notes">5', '“>” needs a Number parameter; “Notes” is not one.'],
    ['>= with a non-number value', '"Volume">="lots"', '“>=” needs a number, not “lots”.'],
    ['.includes on a number', '"Volume".includes("5")', '.includes cannot be used on “Volume”: it is a Number parameter.'],
    ['.includes on a yes/no', '"Hot start".includes("t")', '“Hot start” is a Yes/No parameter: compare it with == or != to true or false.'],
    ['== on a dropdown with a value that is not an option', '"Sample Type"=="Fungi"', '“Fungi” is not an option of “Sample Type”.'],
    ['in on a checkbox list with a value that is not an option', '"Tags" in ("Alpha","Gamma")', '“Gamma” is not an option of “Tags”.'],
    ['true against a text parameter', '"Notes"==true', 'true / false can only be compared with a Yes/No parameter; “Notes” is not one.'],
    ['false against a dropdown', '"Sample Type"!=false', 'true / false can only be compared with a Yes/No parameter; “Sample Type” is not one.'],
    ['a quoted value against a yes/no', '"Hot start"=="true"', '“Hot start” is a Yes/No parameter: compare it to true or false, without quotes.'],
    ['a syntax error', '"Notes"=', 'Unexpected “=” at character 8.']
  ])('%s', (_name, text, message) => {
    expect(problem(text)).toBe(message);
  });

  it('file and samples-spreadsheet controllers', () => {
    expect(problem('"Upload"=="x"', onOperation)).toBe('“Upload” is a File upload parameter and cannot control a condition.');
    expect(problem('"Samples"=="x"', onOperation)).toBe('“Samples” is a Samples spreadsheet parameter and cannot control a condition.');
  });

  it('two parameters with that name in that scope', () => {
    const twins = [{ id: 'a1', name: 'Volume', type: 'number' }, { id: 'a2', name: ' volume ', type: 'number' }, KIT];
    expect(problem('"Volume">5', { list: twins, carrierIndex: 2, sets: [] })).toBe('2 parameters are named “Volume” here.');
    expect(problem('"Twin"."Volume">5', { ...onOperation, sets: [{ id: 't1', name: 'Twin', parameters: [] }, { id: 't2', name: 'twin', parameters: [] }] })).toBe('2 parameter sets are named “Twin”.');
  });

  it('a cycle among the parameters the resolver can see', () => {
    // Sample Type already depends on Kit; Kit may not now depend on Sample Type.
    const list = [{ ...SAMPLE, showIf: { parameterId: 'kit', op: 'eq', value: 'x' } }, KIT];
    expect(problem('"Sample Type"=="Bacteria"', { list, carrierIndex: 1, setId: 'set1', sets: [] })).toBe('This condition would form a loop: the parameter it depends on depends, in turn, on this one.');
    // Across lists: an own parameter depends on a set parameter that depends (qualified) on a set whose parameter is fine.
    const a = { id: 'sA', name: 'A', parameters: [{ id: 'x', name: 'X', type: 'string', showIf: { parameterId: 'y', parameterSetId: 'sB', op: 'eq', value: '1' } }] };
    const b = { id: 'sB', name: 'B', parameters: [{ id: 'y', name: 'Y', type: 'string' }] };
    expect(problem('"A"."X"=="1"', { list: b.parameters, carrierIndex: 0, setId: 'sB', sets: [a, b] })).toBe('This condition would form a loop: the parameter it depends on depends, in turn, on this one.');
    expect(problem('"A"."X"=="1"', { list: own, carrierIndex: 1, sets: [a, b] })).toBe('no error');
  });

  it('a parameter that has no id yet cannot be depended on', () => {
    expect(problem('"New"=="x"', { list: [{ id: '', name: 'New', type: 'string' }, KIT], carrierIndex: 1, sets: [] })).toBe('“New” has no id yet — save it first.');
  });
});

// ------------------------------------------------------------------ printing

describe('conditionText (rule 25)', () => {
  it('writes a same-list reference unqualified and any other as "Set"."Parameter", with current names', () => {
    expect(conditionText({ parameterId: 'sample', op: 'eq', optionIds: ['bact'] }, inSet)).toBe('"Sample Type"=="Bacteria"');
    expect(conditionText({ parameterId: 'sample', parameterSetId: 'set1', op: 'eq', optionIds: ['bact'] }, onOperation)).toBe('"Nucleic Acid Extraction"."Sample Type"=="Bacteria"');
    // A qualified reference to the carrier's own set is the same list.
    expect(conditionText({ parameterId: 'sample', parameterSetId: 'set1', op: 'ne', optionIds: ['bact'] }, inSet)).toBe('"Sample Type"!="Bacteria"');
  });

  it('writes every operator and value kind', () => {
    expect(conditionText({ parameterId: 'tags', op: 'in', optionIds: ['a', 'b'] }, inSet)).toBe('"Tags" in ("Alpha","Beta")');
    expect(conditionText({ parameterId: 'sample', op: 'includes', value: 'cell' }, inSet)).toBe('"Sample Type".includes("cell")');
    expect(conditionText({ parameterId: 'hot', op: 'eq', value: false }, inSet)).toBe('"Hot start"==false');
    expect(conditionText({ parameterId: 'volume', op: 'ge', value: 2.5 }, inSet)).toBe('"Volume">=2.5');
    expect(conditionText({ parameterId: 'note', op: 'in', values: ['a', '2'] }, inSet)).toBe('"Notes" in ("a","2")');
    expect(conditionText({ parameterId: 'note', op: 'eq', value: 'say "hi"' }, inSet)).toBe('"Notes"=="say \\"hi\\""');
  });

  it('parenthesises only where the grammar needs it', () => {
    const a: any = { parameterId: 'volume', op: 'gt', value: 1 };
    const b: any = { parameterId: 'hot', op: 'eq', value: true };
    const c: any = { parameterId: 'note', op: 'eq', value: 'x' };
    expect(conditionText({ any: [a, { all: [b, c] }] }, inSet)).toBe('"Volume">1 || "Hot start"==true && "Notes"=="x"');
    expect(conditionText({ all: [{ any: [a, b] }, c] }, inSet)).toBe('("Volume">1 || "Hot start"==true) && "Notes"=="x"');
    expect(conditionText({ all: [{ all: [a, b] }, c] }, inSet)).toBe('("Volume">1 && "Hot start"==true) && "Notes"=="x"');
  });

  it('is what the parser and resolver read back: text → condition → text → condition', () => {
    for (const text of [
      '"Sample Type"=="Bacteria"',
      '"Tags" in ("Alpha","Beta") && "Hot start"==false',
      '("Volume">1 || "Volume"<=-2.5) && "Notes".includes("rush")',
      '"Cleanup"."Method"!="Column" || "Notes"=="5\\" plate"'
    ]) {
      const condition = resolved(text);
      expect(conditionText(condition, inSet)).toBe(text);
      expect(resolved(conditionText(condition, inSet))).toEqual(condition);
    }
  });

  it('round-trips a name containing a backslash or a double quote (print → parse → resolve)', () => {
    for (const name of ['Path C:\\temp', 'Say "hi"']) {
      const list = [{ id: 'odd', name, type: 'string' }, KIT];
      const scope: ConditionScope = { list, carrierIndex: 1, setId: 'set1', sets: [] };
      const condition: any = { parameterId: 'odd', op: 'eq', value: 'a\\b "c"' };
      const text = conditionText(condition, scope);
      expect(resolved(text, scope)).toEqual(condition);
    }
  });

  it('a rename changes the text, not the condition', () => {
    const condition = resolved('"Sample Type"=="Bacteria"');
    const renamed = [{ ...SAMPLE, name: 'Organism', options: [{ id: 'bact', name: 'E. coli' }] }, KIT];
    expect(conditionText(condition, { list: renamed, setId: 'set1', sets: [] })).toBe('"Organism"=="E. coli"');
  });

  it('writes a reference that no longer resolves as "<missing>", and says what is missing (rules 25, 32)', () => {
    const gone = { list: [KIT], setId: 'set1', sets: [CLEANUP] };
    expect(conditionText({ parameterId: 'sample', op: 'eq', optionIds: ['bact'] }, gone)).toBe('"<missing>"=="<missing>"');
    expect(missingReferences({ parameterId: 'sample', op: 'eq', optionIds: ['bact'] }, gone)).toEqual(['a parameter that no longer exists']);
    expect(conditionText({ parameterId: 'sample', parameterSetId: 'set9', op: 'includes', value: 'x' }, gone)).toBe('"<missing>".includes("x")');
    expect(missingReferences({ parameterId: 'sample', parameterSetId: 'set9', op: 'includes', value: 'x' }, gone)).toEqual(['a parameter set that no longer exists']);
    expect(missingReferences({ parameterId: 'gone', parameterSetId: 'set2', op: 'eq', value: 'x' }, gone)).toEqual(['a parameter that is no longer in “Cleanup”']);
    expect(conditionText({ parameterId: 'sample', op: 'in', optionIds: ['bact', 'dropped'] }, inSet)).toBe('"Sample Type" in ("Bacteria","<missing>")');
    expect(missingReferences({ parameterId: 'sample', op: 'in', optionIds: ['bact', 'dropped'] }, inSet)).toEqual(['an option “Sample Type” no longer has']);
    expect(missingReferences({ parameterId: 'sample', op: 'eq', optionIds: ['bact'] }, inSet)).toEqual([]);
    expect(missingReferences(undefined, inSet)).toEqual([]);
  });

  it('says so when the parameter is still there but its answer format changed under the condition (rule 32)', () => {
    // Sample Type was a dropdown when the condition was written and is text now: the stored option ids mean nothing.
    const retyped = { list: [{ id: 'sample', name: 'Sample Type', type: 'string' }, KIT], setId: 'set1', sets: [] };
    expect(missingReferences({ parameterId: 'sample', op: 'eq', optionIds: ['bact'] }, retyped)).toEqual(['“Sample Type”, whose answer format has changed since']);
    expect(conditionText({ parameterId: 'sample', op: 'eq', optionIds: ['bact'] }, retyped)).toBe('"Sample Type"=="<missing>"');
    // A dropdown that kept its options but became text still does not fit.
    const kept = { list: [{ ...SAMPLE, type: 'string' }, KIT], setId: 'set1', sets: [] };
    expect(missingReferences({ parameterId: 'sample', op: 'eq', optionIds: ['bact'] }, kept)).toEqual(['“Sample Type”, whose answer format has changed since']);
    expect(missingReferences({ parameterId: 'volume', op: 'gt', value: 5 }, { list: [{ ...VOLUME, type: 'string' }], sets: [] })).toEqual(['“Volume”, whose answer format has changed since']);
    expect(missingReferences({ parameterId: 'hot', op: 'eq', value: true }, { list: [{ ...HOT, type: 'dropdown', options: [] }], sets: [] })).toEqual(['“Hot start”, whose answer format has changed since']);
  });

  it('no condition is the empty string', () => {
    expect(conditionText(undefined, inSet)).toBe('');
    expect(conditionText(null, inSet)).toBe('');
  });
});

describe('effectiveScope — an operation’s effective list (rule 33)', () => {
  const effective = [
    { id: 'polymerase', name: 'Polymerase', type: 'string', showIf: { parameterId: 'sample', parameterSetId: 'set1', op: 'eq', optionIds: ['bact'] } },
    { ...SAMPLE, fromParameterSetId: 'set1', fromParameterSetName: 'Nucleic Acid Extraction' },
    { ...KIT, fromParameterSetId: 'set1', fromParameterSetName: 'Nucleic Acid Extraction', showIf: { parameterId: 'sample', op: 'eq', optionIds: ['yeast'] } },
    { id: 'orphan', name: 'Orphan', type: 'string', showIf: { parameterId: 'method', parameterSetId: 'set2', op: 'eq', optionIds: ['col'] } }
  ];
  const textOf = (index: number): string => conditionText(effective[index].showIf as any, effectiveScope(effective[index], effective));

  it('prints an own parameter’s reference into a set the operation uses', () => {
    expect(textOf(0)).toBe('"Nucleic Acid Extraction"."Sample Type"=="Bacteria"');
  });
  it('prints a set parameter’s same-set reference unqualified', () => {
    expect(textOf(2)).toBe('"Sample Type"=="Yeast cells"');
  });
  it('prints a reference into a set the operation does not use as missing', () => {
    expect(textOf(3)).toBe('"<missing>"=="<missing>"');
  });
});

describe('resolveCondition on a syntax tree', () => {
  it('is what conditionFromText does after parsing', () => {
    const parsed = parseCondition('"Volume">5');
    expect('tree' in parsed && resolveCondition(parsed.tree, inSet)).toEqual({ condition: { parameterId: 'volume', op: 'gt', value: 5 } });
  });
});

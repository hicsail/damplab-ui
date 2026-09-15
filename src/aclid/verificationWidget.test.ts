import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACLID_WIDGET_SRC, customerJobPath, loadAclidWidget } from './verificationWidget';

type MockScript = HTMLScriptElement & {
  _listeners: Record<string, Array<() => void>>;
};

function createMockScript(): MockScript {
  const listeners: Record<string, Array<() => void>> = { load: [], error: [] };
  const script = {
    src: '',
    async: false,
    dataset: {} as DOMStringMap,
    _listeners: listeners,
    addEventListener(type: string, handler: () => void, _opts?: { once?: boolean }) {
      listeners[type]?.push(handler);
    },
    remove: vi.fn(function remove(this: MockScript) {
      scriptInHead = null;
    }),
  } as unknown as MockScript;
  return script;
}

let scriptInHead: MockScript | null = null;

describe('verificationWidget', () => {
  const showEmbeddedVerification = vi.fn();
  const createElement = vi.fn();
  const appendChild = vi.fn();

  beforeEach(() => {
    scriptInHead = null;
    createElement.mockReset();
    appendChild.mockReset();
    vi.stubGlobal('window', {
      Aclid: { showEmbeddedVerification },
    });
    vi.stubGlobal('document', {
      createElement,
      head: { appendChild },
      querySelector: vi.fn(() => scriptInHead),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('customerJobPath returns the client view route', () => {
    expect(customerJobPath('abc')).toBe('/client_view/abc');
  });

  it('loadAclidWidget resolves when Aclid is already on window without injecting a script', async () => {
    const widget = await loadAclidWidget();
    expect(widget.showEmbeddedVerification).toBe(showEmbeddedVerification);
    expect(createElement).not.toHaveBeenCalled();
    expect(appendChild).not.toHaveBeenCalled();
  });

  it('rejects on script error, removes the tag, and retries with a fresh injection', async () => {
    vi.resetModules();
    const { loadAclidWidget: loadWidget } = await import('./verificationWidget');

    const showEmbeddedVerificationRetry = vi.fn();
    vi.stubGlobal('window', { Aclid: undefined });

    const firstScript = createMockScript();
    const secondScript = createMockScript();
    createElement.mockImplementationOnce(() => firstScript).mockImplementationOnce(() => secondScript);
    appendChild.mockImplementation((node: MockScript) => {
      scriptInHead = node;
    });

    const firstAttempt = loadWidget();
    expect(createElement).toHaveBeenCalledTimes(1);
    expect(firstScript.src).toBe(ACLID_WIDGET_SRC);

    for (const handler of firstScript._listeners.error) {
      handler();
    }

    await expect(firstAttempt).rejects.toThrow('ACLID_WIDGET_LOAD_FAILED');
    expect(firstScript.remove).toHaveBeenCalled();
    expect(scriptInHead).toBeNull();

    const secondAttempt = loadWidget();
    expect(createElement).toHaveBeenCalledTimes(2);
    expect(secondScript.src).toBe(ACLID_WIDGET_SRC);

    vi.stubGlobal('window', {
      Aclid: { showEmbeddedVerification: showEmbeddedVerificationRetry },
    });

    for (const handler of secondScript._listeners.load) {
      handler();
    }

    const widget = await secondAttempt;
    expect(widget.showEmbeddedVerification).toBe(showEmbeddedVerificationRetry);
    expect(secondScript.remove).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACLID_OVERLAY_Z_INDEX, ACLID_WIDGET_SRC, customerJobPath, dressAclidOverlay, loadAclidWidget, openHostedVerification, showDressedEmbeddedVerification, WIDGET_LOAD_TIMEOUT_MS } from './verificationWidget';

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
    vi.useRealTimers();
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

  /**
   * A script dropped by a proxy fires neither `load` nor `error`. Without a
   * timer the promise never settles, the button stays at "Opening…", and the
   * cached promise poisons every retry — so the hosted fallback is unreachable.
   */
  it('rejects once the load timeout passes, and does not poison the next attempt', async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const { loadAclidWidget: loadWidget } = await import('./verificationWidget');

    vi.stubGlobal('window', { Aclid: undefined });
    const firstScript = createMockScript();
    const secondScript = createMockScript();
    createElement.mockImplementationOnce(() => firstScript).mockImplementationOnce(() => secondScript);
    appendChild.mockImplementation((node: MockScript) => {
      scriptInHead = node;
    });

    const stalled = loadWidget();
    const settled = stalled.then(() => null, (err: Error) => err);
    vi.advanceTimersByTime(WIDGET_LOAD_TIMEOUT_MS);

    expect((await settled)?.message).toBe('ACLID_WIDGET_LOAD_FAILED');
    expect(firstScript.remove).toHaveBeenCalled();

    const retry = loadWidget();
    expect(createElement).toHaveBeenCalledTimes(2);

    const showEmbeddedVerificationRetry = vi.fn();
    vi.stubGlobal('window', { Aclid: { showEmbeddedVerification: showEmbeddedVerificationRetry } });
    for (const handler of secondScript._listeners.load) {
      handler();
    }
    expect((await retry).showEmbeddedVerification).toBe(showEmbeddedVerificationRetry);
  });

  /**
   * The open sits past two awaits, well outside the user-gesture window, so
   * browsers routinely block it. The caller has to be able to tell.
   */
  it('openHostedVerification hands back the window, or null when the popup was blocked', () => {
    const handle = {} as Window;
    const open = vi.fn(() => handle as Window | null);
    vi.stubGlobal('window', { open });

    expect(openHostedVerification('https://verify.aclid.bio/x')).toBe(handle);
    expect(open).toHaveBeenCalledWith('https://verify.aclid.bio/x', '_blank', 'noopener,noreferrer');

    open.mockReturnValue(null);
    expect(openHostedVerification('https://verify.aclid.bio/x')).toBeNull();
  });
});

describe('dressAclidOverlay', () => {
  function styleTarget() {
    const props = new Map<string, string>();
    return {
      props,
      style: { setProperty: (prop: string, value: string) => props.set(prop, value) },
    };
  }

  it('pins the widget panel over the header and adds a close control', () => {
    const overlayStyle = styleTarget();
    const iframeStyle = styleTarget();
    const closeStyle = styleTarget();
    const close = {
      type: '',
      dataset: {} as DOMStringMap,
      textContent: '',
      style: closeStyle.style,
      setAttribute: vi.fn(),
      addEventListener: vi.fn(),
    };
    const overlay = {
      ...overlayStyle,
      querySelector: () => null,
      prepend: vi.fn(),
      remove: vi.fn(),
    };
    const iframe = {
      src: 'https://verify.aclid.bio/?access_token=abc',
      getAttribute: (name: string) => (name === 'src' ? iframe.src : null),
      parentElement: overlay,
      style: iframeStyle.style,
    };
    const doc = {
      body: { style: { overflow: 'hidden' } },
      querySelectorAll: () => [iframe],
      createElement: () => close,
    };

    dressAclidOverlay(iframe.src, doc as never);

    expect(overlayStyle.props.get('position')).toBe('fixed');
    expect(overlayStyle.props.get('z-index')).toBe(String(ACLID_OVERLAY_Z_INDEX));
    expect(iframeStyle.props.get('border-radius')).toBe('12px');
    expect(overlay.prepend).toHaveBeenCalledWith(close);
    const onClick = close.addEventListener.mock.calls.find((call) => call[0] === 'click')?.[1] as () => void;
    onClick();
    expect(doc.body.style.overflow).toBe('');
    expect(overlay.remove).toHaveBeenCalled();
  });

  it('showDressedEmbeddedVerification opens the widget before restyling', () => {
    const showEmbeddedVerification = vi.fn();
    vi.stubGlobal('document', {
      querySelectorAll: () => [],
      createElement: () => ({}),
      body: { style: { overflow: '' } },
    });

    showDressedEmbeddedVerification(
      { showEmbeddedVerification },
      { verificationUrl: 'https://verify.aclid.bio/?access_token=abc' },
    );

    expect(showEmbeddedVerification).toHaveBeenCalledWith({
      verificationUrl: 'https://verify.aclid.bio/?access_token=abc',
    });
  });
});

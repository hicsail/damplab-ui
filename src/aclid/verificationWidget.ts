export const ACLID_WIDGET_SRC = 'https://verify.aclid.bio/widget.js';

/**
 * Above the fixed header (MUI app bar, 1100) and the lab chat button (1300).
 * Aclid's widget hardcodes 1000, so without this the header paints over the panel.
 */
export const ACLID_OVERLAY_Z_INDEX = 1600;

export type AclidWidget = {
  showEmbeddedVerification: (opts: {
    verificationUrl: string;
    onSuccess?: () => void;
    onClose?: () => void;
  }) => void;
};

declare global {
  interface Window {
    Aclid?: AclidWidget;
  }
}

let loadPromise: Promise<AclidWidget> | null = null;

const WIDGET_LOAD_FAILED = 'ACLID_WIDGET_LOAD_FAILED';

/**
 * How long a script tag gets to settle before we call it failed.
 *
 * A script dropped by a proxy or hung on a stalled socket fires neither `load`
 * nor `error`, so without this the promise never settles: the button sits at
 * "Opening…", and every later attempt joins the same dead promise. The hosted
 * page is the sanctioned fallback, and it cannot be reached from a load that
 * never gives up.
 */
export const WIDGET_LOAD_TIMEOUT_MS = 15_000;

export function customerJobPath(jobId: string): string {
  return `/client_view/${jobId}`;
}

function aclidFromWindow(): AclidWidget | undefined {
  const aclid = window.Aclid;
  return typeof aclid?.showEmbeddedVerification === 'function' ? aclid : undefined;
}

function rejectWidgetLoadFailed(reject: (reason: Error) => void, script: HTMLScriptElement) {
  script.remove();
  reject(new Error(WIDGET_LOAD_FAILED));
}

function waitForScript(script: HTMLScriptElement): Promise<AclidWidget> {
  if (script.dataset.loaded === 'error') {
    script.remove();
    return Promise.reject(new Error(WIDGET_LOAD_FAILED));
  }

  const ready = aclidFromWindow();
  if (ready) {
    return Promise.resolve(ready);
  }

  if (script.dataset.loaded === 'true') {
    script.remove();
    return Promise.reject(new Error(WIDGET_LOAD_FAILED));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => rejectWidgetLoadFailed(reject, script),
      WIDGET_LOAD_TIMEOUT_MS,
    );
    const settle = (run: () => void) => {
      clearTimeout(timer);
      run();
    };
    const finish = () =>
      settle(() => {
        const widget = aclidFromWindow();
        if (widget) {
          script.dataset.loaded = 'true';
          resolve(widget);
          return;
        }
        rejectWidgetLoadFailed(reject, script);
      });

    script.addEventListener('load', finish, { once: true });
    script.addEventListener(
      'error',
      () => settle(() => rejectWidgetLoadFailed(reject, script)),
      { once: true },
    );
  });
}

function injectWidgetScript(): Promise<AclidWidget> {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${ACLID_WIDGET_SRC}"]`,
  );
  if (existing) {
    if (existing.dataset.loaded === 'true') {
      return waitForScript(existing);
    }
    existing.remove();
  }

  const script = document.createElement('script');
  script.src = ACLID_WIDGET_SRC;
  script.async = true;
  document.head.appendChild(script);
  return waitForScript(script);
}

export async function loadAclidWidget(): Promise<AclidWidget> {
  const ready = aclidFromWindow();
  if (ready) {
    return ready;
  }

  if (!loadPromise) {
    loadPromise = injectWidgetScript().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

/**
 * Open Aclid's hosted page in a new tab.
 *
 * Returns the handle, or `null` when the browser refused — the call often sits
 * outside the user-gesture window, where Chrome and Safari block it. The
 * hosted page is the fallback for a blocked embed, so a caller that ignores
 * this dead-ends the customer silently.
 */
export function openHostedVerification(url: string): Window | null {
  return window.open(url, '_blank', 'noopener,noreferrer');
}

type OverlayDocument = {
  querySelectorAll: Document['querySelectorAll'];
  createElement: Document['createElement'];
  body: { style: { overflow: string } };
};

/**
 * Aclid's widget appends its own full-window layer: `position: absolute` and
 * `z-index: 1000`. That sits under this app's fixed header and scrolls with
 * the page. Restyle it into a fixed modal, and add a close control — the
 * widget only dismisses itself when the iframe posts a message, so a frame
 * that never loads cannot be closed.
 */
export function dressAclidOverlay(verificationUrl: string, doc: OverlayDocument = document): void {
  const iframe = [...doc.querySelectorAll('iframe')].find(
    (frame) => frame.getAttribute('src') === verificationUrl || frame.src === verificationUrl,
  );
  const overlay = iframe?.parentElement;
  if (!iframe || !overlay) return;

  const set = (el: HTMLElement, prop: string, value: string) => el.style.setProperty(prop, value, 'important');

  set(overlay, 'position', 'fixed');
  set(overlay, 'inset', '0');
  set(overlay, 'top', '0');
  set(overlay, 'left', '0');
  set(overlay, 'width', '100vw');
  set(overlay, 'height', '100dvh');
  set(overlay, 'z-index', String(ACLID_OVERLAY_Z_INDEX));
  set(overlay, 'box-sizing', 'border-box');
  set(overlay, 'padding', '16px');
  set(overlay, 'display', 'flex');
  set(overlay, 'flex-direction', 'column');
  set(overlay, 'align-items', 'center');
  set(overlay, 'justify-content', 'center');
  set(overlay, 'gap', '12px');

  set(iframe, 'width', 'min(768px, 100%)');
  set(iframe, 'height', 'min(860px, calc(100dvh - 72px))');
  set(iframe, 'max-width', '100%');
  set(iframe, 'border', '0');
  set(iframe, 'border-radius', '12px');
  set(iframe, 'background', '#fff');
  set(iframe, 'box-shadow', '0 24px 64px rgba(0, 0, 0, 0.45)');
  set(iframe, 'flex', '0 1 auto');

  if (overlay.querySelector('[data-aclid-close]')) return;

  const close = doc.createElement('button');
  close.type = 'button';
  close.dataset.aclidClose = 'true';
  close.setAttribute('aria-label', 'Close identity verification');
  close.textContent = 'Close';
  set(close, 'align-self', 'flex-end');
  set(close, 'margin', '0');
  set(close, 'padding', '6px 14px');
  set(close, 'border', '0');
  set(close, 'border-radius', '999px');
  set(close, 'background', '#fff');
  set(close, 'color', '#1a1a1a');
  set(close, 'font', '600 14px/1.2 system-ui, sans-serif');
  set(close, 'cursor', 'pointer');
  close.addEventListener('click', () => {
    doc.body.style.overflow = '';
    overlay.remove();
  });
  overlay.prepend(close);
}

/** Open the embed, then correct the overlay the widget just appended. */
export function showDressedEmbeddedVerification(
  widget: AclidWidget,
  opts: { verificationUrl: string; onSuccess?: () => void; onClose?: () => void },
): void {
  widget.showEmbeddedVerification(opts);
  dressAclidOverlay(opts.verificationUrl);
}

export const ACLID_WIDGET_SRC = 'https://verify.aclid.bio/widget.js';

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
    const finish = () => {
      const widget = aclidFromWindow();
      if (widget) {
        script.dataset.loaded = 'true';
        resolve(widget);
        return;
      }
      rejectWidgetLoadFailed(reject, script);
    };

    script.addEventListener('load', finish, { once: true });
    script.addEventListener(
      'error',
      () => rejectWidgetLoadFailed(reject, script),
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

export function openHostedVerification(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

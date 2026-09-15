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

export function customerJobPath(jobId: string): string {
  return `/client_view/${jobId}`;
}

function aclidFromWindow(): AclidWidget | undefined {
  const aclid = window.Aclid;
  return typeof aclid?.showEmbeddedVerification === 'function' ? aclid : undefined;
}

function waitForScript(script: HTMLScriptElement): Promise<AclidWidget> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      const ready = aclidFromWindow();
      if (ready) {
        resolve(ready);
        return;
      }
      reject(new Error('ACLID_WIDGET_LOAD_FAILED'));
    };

    script.addEventListener('load', finish, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('ACLID_WIDGET_LOAD_FAILED')),
      { once: true },
    );

    if (script.dataset.loaded === 'true') {
      finish();
    }
  });
}

function injectWidgetScript(): Promise<AclidWidget> {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${ACLID_WIDGET_SRC}"]`,
  );
  if (existing) {
    return waitForScript(existing);
  }

  const script = document.createElement('script');
  script.src = ACLID_WIDGET_SRC;
  script.async = true;
  script.addEventListener(
    'load',
    () => {
      script.dataset.loaded = 'true';
    },
    { once: true },
  );
  script.addEventListener(
    'error',
    () => {
      script.dataset.loaded = 'error';
    },
    { once: true },
  );
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

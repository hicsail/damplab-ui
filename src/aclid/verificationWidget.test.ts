import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customerJobPath, loadAclidWidget } from './verificationWidget';

describe('verificationWidget', () => {
  const showEmbeddedVerification = vi.fn();
  const createElement = vi.fn();
  const appendChild = vi.fn();

  beforeEach(() => {
    createElement.mockReset();
    appendChild.mockReset();
    vi.stubGlobal('window', {
      Aclid: { showEmbeddedVerification },
    });
    vi.stubGlobal('document', {
      createElement,
      head: { appendChild },
      querySelector: vi.fn(() => null),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
});

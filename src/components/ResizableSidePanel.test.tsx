import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ResizableSidePanel, { clampPanelWidth } from './ResizableSidePanel';

describe('ResizableSidePanel', () => {
    it('keeps a minimum width and always leaves the canvas some room', () => {
        expect(clampPanelWidth(100, 1600)).toBe(280);
        expect(clampPanelWidth(900, 1600)).toBe(900);
        expect(clampPanelWidth(1500, 1600)).toBe(1280);
    });

    it('draws its children beside a drag handle, at the old width until dragged', () => {
        const html = renderToStaticMarkup(<ResizableSidePanel><p>params</p></ResizableSidePanel>);
        expect(html).toContain('role="separator"');
        expect(html).toContain('aria-label="Resize the parameters panel"');
        expect(html).toContain('width:850px');
        expect(html).toContain('<p>params</p>');
    });
});

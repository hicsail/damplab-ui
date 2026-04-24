import React from 'react';
import ReactDOM from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { Buffer } from 'buffer';

function applyUiTerminologyReplacements(root: Node) {
  // Replace only user-visible rendered text, not schema identifiers.
  // Skip inputs/textareas/contenteditable so we don't mutate user-entered text.
  const EXCLUDED_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEXTAREA',
    'INPUT',
    'CODE',
    'PRE',
  ]);

  const isExcluded = (node: Node | null): boolean => {
    let cur: Node | null = node;
    while (cur) {
      if (cur instanceof HTMLElement) {
        if (cur.isContentEditable) return true;
        const tag = cur.tagName;
        if (EXCLUDED_TAGS.has(tag)) return true;
      }
      cur = cur.parentNode;
    }
    return false;
  };

  const replaceText = (text: string) =>
    text
      .replace(/\bServices\b/g, 'Operations')
      .replace(/\bService\b/g, 'Operation');

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    if (!isExcluded(node)) {
      const tn = node as Text;
      const original = tn.nodeValue ?? '';
      if (original && /\bService(s)?\b/.test(original)) {
        const updated = replaceText(original);
        if (updated !== original) tn.nodeValue = updated;
      }
    }
    node = walker.nextNode();
  }
}

function installUiTerminologyObserver() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Initial pass after hydration.
  applyUiTerminologyReplacements(document.body);

  let scheduled = false;
  let pendingRoots: Node[] = [];
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      const roots = pendingRoots.length ? pendingRoots : [document.body];
      pendingRoots = [];
      for (const r of roots) applyUiTerminologyReplacements(r);
    });
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        // Only rescan the subtree that actually changed.
        if (n.nodeType === Node.TEXT_NODE) {
          pendingRoots.push(n);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          pendingRoots.push(n);
        }
      });
    }
    schedule();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Polyfill for Buffer (needed for some libraries)
if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
  (window as any).Buffer = Buffer;
}

ReactDOM.hydrateRoot(
    document,
    <React.StrictMode>
      <HydratedRouter />
    </React.StrictMode>
);

installUiTerminologyObserver();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

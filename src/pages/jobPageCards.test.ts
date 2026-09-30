import { describe, it, expect } from 'vitest';
import clientView from './ClientView.tsx?raw';
import technicianView from './TechnicianView.tsx?raw';

const count = (source: string, needle: string): number => source.split(needle).length - 1;

describe('client job page (behaviour 1)', () => {
  it('renders no Results card', () => {
    expect(count(clientView, '<ResultsPanel')).toBe(0);
  });

  it('renders no Biosecurity card and no identity-verification entry point', () => {
    expect(count(clientView, 'title="Biosecurity"')).toBe(0);
    expect(clientView).not.toContain('BiosecurityScreeningSections');
    expect(clientView).not.toContain('START_JOB_CUSTOMER_VERIFICATION');
    expect(clientView).not.toContain('Verify identity');
  });
});

describe('staff job page (behaviours 2, 3)', () => {
  it('renders exactly one Results card', () => {
    expect(count(technicianView, '<ResultsPanel')).toBe(1);
  });

  it('keeps the Biosecurity card and its Copy verification link action', () => {
    expect(count(technicianView, 'title="Biosecurity"')).toBe(1);
    expect(technicianView).toContain('COPY_VERIFICATION_LINK');
  });
});

import { describe, it, expect } from 'vitest';
import clientView from './ClientView.tsx?raw';
import technicianView from './TechnicianView.tsx?raw';
import screener from './Screener.tsx?raw';

const count = (source: string, needle: string): number => source.split(needle).length - 1;

describe('client job page (behaviour 1)', () => {
  it('renders no Results card', () => {
    expect(count(clientView, '<ResultsPanel')).toBe(0);
  });

  it('shows only identity verification, and only when the account flag is on', () => {
    expect(count(clientView, 'title="Biosecurity"')).toBe(1);
    expect(clientView).toContain('showBiosecurity');
    expect(clientView).toContain('customerVerificationPresentation');
    expect(clientView).toContain('Submitted');
    expect(clientView).not.toContain('BiosecurityScreeningSections');
    expect(clientView).toContain('START_JOB_CUSTOMER_VERIFICATION');
    expect(clientView).toContain('loadAclidWidget');
    expect(clientView).toContain('showDressedEmbeddedVerification');
    expect(clientView).toContain('openHostedVerification');
    expect(clientView).toContain('Verify identity');
    expect(clientView).toContain('Open Aclid page');
  });
});

describe('staff job page (behaviours 2, 3)', () => {
  it('Screener has no per-account switch', () => expect(screener).not.toContain('showBiosecurity'));

  it('renders exactly one Results card', () => {
    expect(count(technicianView, '<ResultsPanel')).toBe(1);
  });

  it('keeps the full Biosecurity card for accounts that can see it', () => {
    expect(count(technicianView, 'title="Biosecurity"')).toBe(1);
    expect(technicianView).toContain('showBiosecurity');
    expect(technicianView).toMatch(/showBiosecurity = can\(PERMISSIONS\.JobsViewAll\)/);
    expect(technicianView).not.toContain('userProps?.showBiosecurity');
    expect(technicianView).toContain('ScreeningResults');
    expect(technicianView).toContain('ReportingOptionsDialog');
    expect(technicianView).toMatch(/GET_SCREENING_RUN_CARD[\s\S]{0,200}fetchPolicy: ["']no-cache["']/);
    // Behaviour 17's ban on a Copy verification link is lifted (human ruling, wave 3): the button
    // is its own control, minted by the same mutation; the hosted page is still never opened.
    expect(technicianView).toContain('CopyVerificationLinkButton');
    expect(technicianView).not.toContain('Open hosted verification');
    expect(technicianView).not.toContain('openHostedVerification');
    expect(technicianView).toContain('START_JOB_CUSTOMER_VERIFICATION');
  });
});

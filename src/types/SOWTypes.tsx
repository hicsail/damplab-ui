// SOWTypes.tsx - TypeScript interfaces for Statement of Work generation

export interface SOWData {
  id: string;
  sowNumber: string;
  /** Human-readable date (or ISO) for display; format in PDF. */
  date: string;
  /** Technician-entered document title, e.g. "Agreement to Perform Research Services". */
  sowTitle?: string;
  jobId: string;
  jobName: string;
  clientName: string;
  clientEmail: string;
  clientInstitution: string;
  clientAddress?: string;
  scopeOfWork: string[]; // Array of bullet points
  deliverables: string[];
  timeline: {
    startDate: string;
    endDate: string;
    duration: string;
  };
  resources: {
    projectManager: string;
    projectLead: string;
  };
  pricing: {
    baseCost: number;
    adjustments: SOWPricingAdjustment[];
    totalCost: number;
    /**
     * Removed. `SOWPricing.discount` never affected any total — the mechanism that
     * works is a `DISCOUNT` entry in `adjustments`, which reduces the total, is
     * carried onto invoices and is prorated across partial ones. The field is
     * deprecated server-side and deleted a release later; no query selects it any
     * more, so nothing here could hold a value.
     */
  };
  services: SOWService[];
  terms: string;
  additionalInformation?: string; // Add this field
  createdAt: string;
  createdBy: string;
  /** Set when client signs through the UI */
  clientSignature?: SOWSignature;
  /** Set when technician/BU signs through the UI */
  technicianSignature?: SOWSignature;
}

export interface SOWSignature {
  name: string;
  title?: string;
  signedAt: string; // ISO date string
  /** Data URL (e.g. from canvas) for drawn signature; if missing, PDF will show typed name */
  signatureDataUrl?: string;
}

export interface SOWPricingAdjustment {
  id: string;
  type: 'discount' | 'additional_cost' | 'special_term';
  description: string;
  amount: number;
  reason?: string;
}

export interface SOWService {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: string;
  /** How the service base price is computed (mirrors catalog service). */
  pricingMode?: 'SERVICE' | 'PARAMETER';
  /** Service parameter definitions (for invoice / multiplier display). */
  parameters?: any[];
  /** Parameter values for pricing calculations when needed. */
  formData?: any;
  /** Optional line-item breakdown for parameter/option-level pricing. */
  pricingDetails?: Array<{
    label: string;
    quantity: number;
    unitPrice: number;
    total: number;
    /**
     * 'option' (default): traditional per-option line item showing
     *   {label}: {quantity} × {unitPrice} = {total}.
     * 'multiplier': parameter flagged as isPriceMultiplier — the value scales
     *   the whole service cost. Rendered as "× {quantity}" with no per-unit math.
     */
    kind?: 'option' | 'multiplier';
  }>;
}


export interface SOWTechnicianInputs {
  projectManager: string;
  projectLead: string;
  /** Technician-entered SOW document title. */
  sowTitle: string;
  startDate: string;
  duration: number; // in days
  pricingAdjustments: SOWPricingAdjustment[];
  specialInstructions?: string;
  clientProjectManager?: string;
  clientCostCenter?: string;
}

export interface SOWEditableSections {
  scopeOfWork: string[]; // Array of bullet points
  deliverables: string[]; // Array of deliverable items
  services: SOWService[]; // Can edit service descriptions
  additionalInformation?: string; // New custom section
}


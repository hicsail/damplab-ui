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
    discount?: {
      amount: number;
      reason: string;
    };
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
  /** Parameter values for pricing calculations when needed. */
  formData?: any;
  /** Optional line-item breakdown for parameter/option-level pricing. */
  pricingDetails?: Array<{
    label: string;
    quantity: number;
    unitPrice: number;
    total: number;
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


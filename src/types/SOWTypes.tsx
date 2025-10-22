// SOWTypes.tsx - TypeScript interfaces for Statement of Work generation

export interface SOWData {
  id: string;
  sowNumber: string;
  date: string;
  jobId: string;
  jobName: string;
  clientName: string;
  clientEmail: string;
  clientInstitution: string;
  clientAddress?: string;
  scopeOfWork: string;
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
}


export interface SOWTechnicianInputs {
  projectManager: string;
  projectLead: string;
  startDate: string;
  duration: number; // in days
  pricingAdjustments: SOWPricingAdjustment[];
  specialInstructions?: string;
  clientProjectManager?: string;
  clientCostCenter?: string;
}

export interface SOWEditableSections {
  scopeOfWork: string;
  deliverables: string[]; // Array of deliverable items
  services: SOWService[]; // Can edit service descriptions
  additionalInformation?: string; // New custom section
}


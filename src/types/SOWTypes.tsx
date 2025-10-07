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

// Future template functionality interfaces (currently unused)
// export interface SOWTemplate { ... }
// export interface SOWSectionConfig { ... }

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

// Future functionality interfaces (currently unused)
// export interface SOWTeamMember { ... }
// export interface ServiceContentGenerator { ... }

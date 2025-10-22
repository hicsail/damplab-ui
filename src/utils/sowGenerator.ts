// sowGenerator.ts - SOW content generation utilities

import { SOWData, SOWTechnicianInputs, SOWPricingAdjustment, SOWService } from '../types/SOWTypes';
import { Workflow } from '../gql/graphql';

// Constants
const SOW_STORAGE_KEY = 'damplab-sows';

// Local interface for service generators
interface ServiceContentGenerator {
  serviceId: string;
  scopeOfWork: (params: any) => string;
  deliverables: (params: any) => string[];
  estimatedDuration: (params: any) => number; // in days
  baseCost: (params: any) => number;
}

// Service-specific content generators
const serviceGenerators: ServiceContentGenerator[] = [
  {
    serviceId: 'next-gen-seq',
    scopeOfWork: (params: any) => "The scope of this service will be to run an already prepared pool of samples on a P1 flow cell at the DAMP Lab.",
    deliverables: (params: any) => ["Raw sequencing data"],
    estimatedDuration: (params: any) => 14, // 2 weeks
    baseCost: (params: any) => 1438
  },
  {
    serviceId: 'pcr',
    scopeOfWork: (params: any) => "The scope of this service will be to perform PCR amplification of the provided DNA samples using the specified primers and conditions.",
    deliverables: (params: any) => ["PCR products", "Gel electrophoresis results"],
    estimatedDuration: (params: any) => 7,
    baseCost: (params: any) => 150
  },
  {
    serviceId: 'gel-electrophoresis',
    scopeOfWork: (params: any) => "The scope of this service will be to perform gel electrophoresis analysis of the provided DNA samples to verify size and quality.",
    deliverables: (params: any) => ["Gel electrophoresis results", "Sample quality assessment"],
    estimatedDuration: (params: any) => 3,
    baseCost: (params: any) => 75
  },
  {
    serviceId: 'gibson-assembly',
    scopeOfWork: (params: any) => "The scope of this service will be to perform Gibson assembly of the provided DNA fragments using the specified vector and insert sequences.",
    deliverables: (params: any) => ["Assembled plasmid DNA", "Sequence verification results"],
    estimatedDuration: (params: any) => 10,
    baseCost: (params: any) => 300
  },
  {
    serviceId: 'transformation',
    scopeOfWork: (params: any) => "The scope of this service will be to transform competent cells with the provided plasmid DNA and select for successful transformants.",
    deliverables: (params: any) => ["Transformed bacterial colonies", "Colony PCR verification"],
    estimatedDuration: (params: any) => 5,
    baseCost: (params: any) => 100
  },
  {
    serviceId: 'miniprep',
    scopeOfWork: (params: any) => "The scope of this service will be to perform plasmid miniprep extraction from bacterial cultures and generate glycerol stocks.",
    deliverables: (params: any) => ["Plasmid DNA", "Glycerol stocks"],
    estimatedDuration: (params: any) => 3,
    baseCost: (params: any) => 50
  }
];

// Get next SOW number from localStorage
const getNextSOWNumber = (): string => {
  const stored = localStorage.getItem(SOW_STORAGE_KEY);
  const existingSOWs = stored ? JSON.parse(stored) : [];
  const nextNumber = existingSOWs.length + 1;
  return nextNumber.toString().padStart(3, '0');
};

// Generate scope of work based on workflow analysis
const generateScopeOfWork = (workflows: Workflow[]): string => {
  const serviceTypes = new Set<string>();
  const serviceNames = new Set<string>();
  
  workflows.forEach(workflow => {
    workflow.nodes.forEach(node => {
      if (node.service?.id) {
        serviceTypes.add(node.service.id);
        serviceNames.add(node.service.name);
      }
    });
  });

  // Check for specific service combinations
  if (serviceTypes.has('next-gen-seq')) {
    return "The scope of this service will be to run an already prepared pool of samples on a P1 flow cell at the DAMP Lab.";
  }
  
  if (serviceTypes.has('pcr') && serviceTypes.has('gel-electrophoresis')) {
    return "The scope of this service will be to perform PCR amplification and gel electrophoresis analysis of the provided DNA samples.";
  }
  
  if (serviceTypes.has('gibson-assembly')) {
    return "The scope of this service will be to perform Gibson assembly of the provided DNA fragments and subsequent transformation and verification.";
  }
  
  // Generic scope based on services
  const serviceList = Array.from(serviceNames).join(', ');
  return `The scope of this service will be to perform the following molecular biology services: ${serviceList}.`;
};

// Generate deliverables based on services
const generateDeliverables = (workflows: Workflow[]): string[] => {
  const deliverables = new Set<string>();
  
  workflows.forEach(workflow => {
    workflow.nodes.forEach(node => {
      if (node.service?.id) {
        const generator = serviceGenerators.find(g => g.serviceId === node.service.id);
        if (generator) {
          generator.deliverables(node.formData || {}).forEach(deliverable => {
            deliverables.add(deliverable);
          });
        }
      }
    });
  });

  // Add default deliverables if none found
  if (deliverables.size === 0) {
    deliverables.add("Completed molecular biology services as specified");
    deliverables.add("Quality control results");
  }

  return Array.from(deliverables);
};

// Calculate timeline based on services
const calculateTimeline = (workflows: Workflow[], startDate: string): { startDate: string; endDate: string; duration: string } => {
  let maxDuration = 0;
  
  workflows.forEach(workflow => {
    workflow.nodes.forEach(node => {
      if (node.service?.id) {
        const generator = serviceGenerators.find(g => g.serviceId === node.service.id);
        if (generator) {
          maxDuration = Math.max(maxDuration, generator.estimatedDuration(node.formData || {}));
        }
      }
    });
  });

  // Default to 2 weeks if no specific duration found
  if (maxDuration === 0) {
    maxDuration = 14;
  }

  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + maxDuration);

  return {
    startDate: start.toLocaleDateString(),
    endDate: end.toLocaleDateString(),
    duration: `${maxDuration} days`
  };
};

// Calculate base pricing
const calculateBasePricing = (workflows: Workflow[]): number => {
  let totalCost = 0;
  
  workflows.forEach(workflow => {
    workflow.nodes.forEach(node => {
      if (node.service?.id) {
        const generator = serviceGenerators.find(g => g.serviceId === node.service.id);
        if (generator) {
          totalCost += generator.baseCost(node.formData || {});
        }
      }
    });
  });

  return totalCost;
};

// Generate services list for SOW
const generateServicesList = (workflows: Workflow[]): SOWService[] => {
  const services: SOWService[] = [];
  
  workflows.forEach(workflow => {
    workflow.nodes.forEach(node => {
      if (node.service?.id) {
        const generator = serviceGenerators.find(g => g.serviceId === node.service.id);
        if (generator) {
          services.push({
            id: node.service.id,
            name: node.service.name,
            description: generator.scopeOfWork(node.formData || {}),
            cost: generator.baseCost(node.formData || {}),
            category: 'molecular-biology'
          });
        }
      }
    });
  });

  return services;
};

// Generate complete SOW data
export const generateSOWData = (
  jobData: any,
  technicianInputs: SOWTechnicianInputs
): SOWData => {
  const sowNumber = getNextSOWNumber();
  const baseCost = calculateBasePricing(jobData.workflows);
  const adjustments = technicianInputs.pricingAdjustments || [];
  const discountAmount = adjustments
    .filter(adj => adj.type === 'discount')
    .reduce((sum, adj) => sum + adj.amount, 0);
  
  const totalCost = baseCost - discountAmount + 
    adjustments
      .filter(adj => adj.type === 'additional_cost')
      .reduce((sum, adj) => sum + adj.amount, 0);

  const timeline = calculateTimeline(jobData.workflows, technicianInputs.startDate);

  return {
    id: `sow-${Date.now()}`,
    sowNumber: `SOW ${sowNumber}`,
    date: new Date().toLocaleDateString(),
    jobId: jobData.id,
    jobName: jobData.name,
    clientName: jobData.username,
    clientEmail: jobData.email,
    clientInstitution: jobData.institute,
    clientAddress: jobData.institute, // Could be enhanced with address lookup
    scopeOfWork: generateScopeOfWork(jobData.workflows),
    deliverables: generateDeliverables(jobData.workflows),
    timeline,
    resources: {
      projectManager: technicianInputs.projectManager,
      projectLead: technicianInputs.projectLead,
    },
    pricing: {
      baseCost,
      adjustments,
      totalCost,
      discount: discountAmount > 0 ? {
        amount: discountAmount,
        reason: adjustments.find(adj => adj.type === 'discount')?.reason || 'Special pricing'
      } : undefined
    },
    services: generateServicesList(jobData.workflows),
    terms: getStandardTerms(),
    createdAt: new Date().toISOString(),
    createdBy: 'technician' // Could be enhanced with actual user info
  };
};

// Standard terms template
const getStandardTerms = (): string => {
  return `This Statement of Work (SOW) contains price and time information as per the discussions between the Trustees of Boston University on behalf of the DAMP Lab at Boston University (hereinafter, "DAMP") and the potential client, to be officially reviewed and assigned by both parties. It contains the description of the services to be performed by DAMP, with relevant costs and terms, including scope of work, deliverables, and responsibilities of DAMP.

The services herewith mentioned shall commence on the specified start date and continue until completion. The total turn-around time is estimated to be within the specified duration from the start date.

University Responsibilities:
It is the responsibility of the University to provide regular and detailed updates about the Project and Project development, and to ensure that services are delivered on time with high-quality results and that the agreed number of service hours dedicated by the DAMP Lab team for the Project are rendered.

Client Responsibilities:
The client is responsible for providing all necessary materials and samples to the DAMP Lab for processing as well as all data analysis unless otherwise specified.

Fee Schedule:
This engagement will be conducted on a Project basis. The total value for the Services pursuant to this SOW is presented in the pricing section below.

Completion Criteria:
University shall have fulfilled its obligations when University completes the Services described within this SOW, and Sponsor accepts such Services without unreasonable objections. No response from Sponsor within 2-business days of deliverables being delivered by University is deemed acceptance.`;
};

// localStorage utilities
export const storeSOW = (sowData: SOWData): void => {
  const stored = localStorage.getItem(SOW_STORAGE_KEY);
  const existingSOWs = stored ? JSON.parse(stored) : [];
  existingSOWs.push(sowData);
  localStorage.setItem(SOW_STORAGE_KEY, JSON.stringify(existingSOWs));
};

// Team members data (could be moved to a separate file or API)
export const getTeamMembers = () => [
  { id: 'courtney', name: 'Courtney Tretheway', title: 'Operations Director', email: 'courtney@bu.edu', available: true },
  { id: 'kristen', name: 'Kristen Sheldon', title: 'Project Lead', email: 'kristen@bu.edu', available: true },
  { id: 'john', name: 'John Smith', title: 'Senior Technician', email: 'john@bu.edu', available: true },
  { id: 'jane', name: 'Jane Doe', title: 'Lab Manager', email: 'jane@bu.edu', available: true }
];

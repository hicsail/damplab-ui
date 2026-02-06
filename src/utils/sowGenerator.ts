// sowGenerator.ts - SOW content generation utilities

import { addDays, format } from 'date-fns';
import { SOWData, SOWTechnicianInputs, SOWPricingAdjustment, SOWService } from '../types/SOWTypes';
import { Workflow } from '../gql/graphql';
import { calculateServiceCost } from './servicePricing';

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

// Get next SOW number from localStorage (legacy; prefer unique per-job number for new SOWs)
const getNextSOWNumber = (): string => {
  const stored = localStorage.getItem(SOW_STORAGE_KEY);
  const existingSOWs = stored ? JSON.parse(stored) : [];
  const nextNumber = existingSOWs.length + 1;
  return nextNumber.toString().padStart(3, '0');
};

/** Unique SOW number for a new SOW so same job name across jobs never conflicts. */
export const getUniqueSOWNumberForJob = (jobId: string): string => {
  return `SOW-${jobId}-${Date.now().toString(36)}`;
};

// Extract sample/plate counts from formData
const extractSamplePlateInfo = (formData: any): { samples?: number; plates?: number; description?: string } => {
  if (!formData || typeof formData !== 'object') return {};
  
  let samples: number | undefined;
  let plates: number | undefined;
  let description: string | undefined;
  
  // Handle array of formData (NodeParameter[])
  if (Array.isArray(formData)) {
    formData.forEach((param: any) => {
      const paramName = (param.name || '').toLowerCase();
      const paramId = (param.id || '').toLowerCase();
      const value = param.value;
      
      if ((paramName.includes('sample') || paramId.includes('sample-number') || paramId.includes('num-samples')) && typeof value === 'number') {
        samples = value;
      }
      if ((paramName.includes('plate') || paramId.includes('plate')) && typeof value === 'number') {
        plates = value;
      }
    });
  } else {
    // Handle object formData
    Object.keys(formData).forEach(key => {
      const lowerKey = key.toLowerCase();
      const value = formData[key];
      
      if ((lowerKey.includes('sample') || lowerKey.includes('sample-number') || lowerKey.includes('num-samples')) && typeof value === 'number') {
        samples = value;
      }
      if (lowerKey.includes('plate') && typeof value === 'number') {
        plates = value;
      }
    });
  }
  
  if (samples && plates) {
    description = `${samples} samples across ${plates} plate${plates > 1 ? 's' : ''}`;
  } else if (samples) {
    description = `${samples} sample${samples > 1 ? 's' : ''}`;
  } else if (plates) {
    description = `${plates} plate${plates > 1 ? 's' : ''}`;
  }
  
  return { samples, plates, description };
};

// Generate scope of work based on workflow analysis
const generateScopeOfWork = (workflows: Workflow[]): string[] => {
  const scopeItems: string[] = [];
  const serviceMap = new Map<string, { name: string; formData: any; count: number }>();
  
  workflows.forEach(workflow => {
    workflow.nodes.forEach(node => {
      if (node.service?.id) {
        const serviceId = node.service.id;
        const existing = serviceMap.get(serviceId);
        
        if (existing) {
          existing.count++;
        } else {
          serviceMap.set(serviceId, {
            name: node.service.name,
            formData: node.formData,
            count: 1
          });
        }
      }
    });
  });

  // Generate bullet points for each service
  serviceMap.forEach((serviceInfo, serviceId) => {
    const sampleInfo = extractSamplePlateInfo(serviceInfo.formData);
    let itemText = '';
    
    // Build service description based on service type
    switch (serviceId) {
      case 'next-gen-seq':
        itemText = 'Run an already prepared pool of samples on a P1 flow cell at the DAMP Lab';
        break;
      case 'pcr':
        itemText = 'Perform PCR amplification of the provided DNA samples using the specified primers and conditions';
        break;
      case 'gel-electrophoresis':
        itemText = 'Perform gel electrophoresis analysis of the provided DNA samples to verify size and quality';
        break;
      case 'gibson-assembly':
        itemText = 'Perform Gibson assembly of the provided DNA fragments using the specified vector and insert sequences';
        break;
      case 'transformation':
        itemText = 'Transform competent cells with the provided plasmid DNA and select for successful transformants';
        break;
      case 'miniprep':
        itemText = 'Perform plasmid miniprep extraction from bacterial cultures and generate glycerol stocks';
        break;
      default:
        itemText = `Perform ${serviceInfo.name}`;
    }
    
    // Add sample/plate information if available
    if (sampleInfo.description) {
      itemText += ` (${sampleInfo.description})`;
    }
    
    // Add count if service appears multiple times
    if (serviceInfo.count > 1) {
      itemText += ` - ${serviceInfo.count} instance${serviceInfo.count > 1 ? 's' : ''}`;
    }
    
    scopeItems.push(itemText);
  });

  // If no services found, add a generic item
  if (scopeItems.length === 0) {
    scopeItems.push('Perform molecular biology services as specified in the workflow');
  }

  return scopeItems;
};

// Generate deliverables based on services
const generateDeliverables = (workflows: Workflow[]): string[] => {
  const deliverables = new Set<string>();
  
  workflows.forEach(workflow => {
    workflow.nodes.forEach(node => {
      if (node.service?.id) {
        // Use deliverables from service if available, otherwise fall back to hardcoded generators
        if (node.service.deliverables && Array.isArray(node.service.deliverables) && node.service.deliverables.length > 0) {
          node.service.deliverables.forEach((deliverable: string) => {
            deliverables.add(deliverable);
          });
        } else {
          // Fallback to hardcoded generators for backward compatibility
          const generator = serviceGenerators.find(g => g.serviceId === node.service.id);
          if (generator) {
            generator.deliverables(node.formData || {}).forEach(deliverable => {
              deliverables.add(deliverable);
            });
          }
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

/** Project length in days; used for Period of Performance text. */
function getProjectLengthDays(workflows: Workflow[], overrideDays?: number): number {
  if (overrideDays != null && overrideDays > 0) return overrideDays;
  let maxDuration = 0;
  workflows.forEach(workflow => {
    workflow.nodes.forEach(node => {
      if (node.service?.id) {
        const g = serviceGenerators.find(x => x.serviceId === node.service.id);
        if (g) maxDuration = Math.max(maxDuration, g.estimatedDuration(node.formData || {}));
      }
    });
  });
  return maxDuration > 0 ? maxDuration : 14;
}

/** Timeline for SOW. Uses technician override duration when provided and > 0. */
const calculateTimeline = (
  workflows: Workflow[],
  startDate: string,
  overrideDurationDays?: number
): { startDate: string; endDate: string; duration: string; days: number } => {
  const days = getProjectLengthDays(workflows, overrideDurationDays);
  const start = new Date(startDate);
  const end = addDays(start, days);

  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
    duration: `${days} day${days !== 1 ? 's' : ''}`,
  };
};

const getNodeCost = (node: any): number => {
  if (!node?.service?.id) return 0;

  const hasPricingData =
    node.service?.pricingMode === 'PARAMETER' ||
    (node.service?.price !== undefined && node.service?.price !== null) ||
    (node.price !== undefined && node.price !== null);

  const computedCost = calculateServiceCost(
    node.service,
    node.formData,
    node.price
  );

  if (hasPricingData) {
    return computedCost;
  }

  const generator = serviceGenerators.find(g => g.serviceId === node.service.id);
  return generator ? generator.baseCost(node.formData || {}) : 0;
};

// Calculate base pricing
const calculateBasePricing = (workflows: Workflow[]): number => {
  let totalCost = 0;
  
  workflows.forEach(workflow => {
    workflow.nodes.forEach(node => {
      totalCost += getNodeCost(node);
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
        const servicePrice = getNodeCost(node);
        
        // Use scope description from generator (could be enhanced to come from service in future)
        const generator = serviceGenerators.find(g => g.serviceId === node.service.id);
        const description = generator 
          ? generator.scopeOfWork(node.formData || {})
          : `Perform ${node.service.name}`;
        
        services.push({
          id: node.service.id,
          name: node.service.name,
          description: description,
          cost: servicePrice,
          category: 'molecular-biology',
          formData: node.formData
        });
      }
    });
  });

  return services;
};

// Generate complete SOW data
/** existingSOW: when provided (updating existing SOW), re-use its id/sowNumber to avoid conflicts. */
export const generateSOWData = (
  jobData: any,
  technicianInputs: SOWTechnicianInputs,
  existingSOW?: { id?: string; sowNumber?: string }
): SOWData => {
  const sowNumber = existingSOW?.sowNumber ?? getUniqueSOWNumberForJob(jobData.id);
  const baseCost = calculateBasePricing(jobData.workflows);
  const adjustments = technicianInputs.pricingAdjustments || [];
  const discountAmount = adjustments
    .filter(adj => adj.type === 'discount')
    .reduce((sum, adj) => sum + adj.amount, 0);
  
  const totalCost = baseCost - discountAmount + 
    adjustments
      .filter(adj => adj.type === 'additional_cost')
      .reduce((sum, adj) => sum + adj.amount, 0);

  const timeline = calculateTimeline(
    jobData.workflows,
    technicianInputs.startDate,
    technicianInputs.duration
  );

  const sowTitle = (technicianInputs.sowTitle || '').trim() || 'Agreement to Perform Research Services';

  return {
    id: existingSOW?.id ?? `sow-${Date.now()}`,
    sowNumber: sowNumber.startsWith('SOW') ? sowNumber : `SOW ${sowNumber}`,
    date: format(new Date(), 'yyyy-MM-dd'),
    sowTitle,
    jobId: jobData.id,
    jobName: jobData.name,
    clientName: technicianInputs.clientProjectManager || jobData.username || 'Client',
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
DAMP Lab shall have fulfilled its obligations when DAMP Lab completes the Services described within this SOW, and Client accepts such Services without unreasonable objections. No response from Client within 2-business days of deliverables being delivered by DAMP Lab is deemed acceptance.`;
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

import { Parameter } from "./Parameter";

export type ServicePricingMode = 'SERVICE' | 'PARAMETER';

export type Service = {
    id: string;
    name: string;
    price?: number | null;
    pricingMode?: ServicePricingMode;
    icon: string;
    // optional result params
    resultParams?: string[];
    parameters?: Parameter[];
    allowedConnections: string[];
    result?: any;
    categories: string[];
    description: string;
    paramGroups?: any[];
    deliverables?: string[];  // Array of deliverable descriptions
};  




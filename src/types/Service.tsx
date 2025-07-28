import { Parameter } from "./Parameter";

export type Service = {
    id: string;
    name: string;
    icon: string;
    price: number;
    // optional result params
    resultParams?: string[];
    parameters?: Parameter[];
    allowedConnections: string[];
    result?: any;
    categories: string[];
    description: string;
    paramGroups?: any[];
};  




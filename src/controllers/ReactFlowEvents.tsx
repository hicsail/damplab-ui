
import { NodeData, NodeParameter } from '../types/CanvasTypes';
import {
    RUN_COUNT_PARAM_ID,
    RUN_COUNT_PARAM_NAME,
    EQUIPMENT_BOOKERS_PARAM_ID,
    EQUIPMENT_END_PARAM_ID,
    EQUIPMENT_HOURS_PER_WEEK_PARAM_ID,
    EQUIPMENT_OPEN_END_PARAM_ID,
    EQUIPMENT_PARAM_IDS,
    EQUIPMENT_PARAM_NAMES,
    EQUIPMENT_START_PARAM_ID
} from '../utils/servicePricing';


/**
 * Whether a service offers the "Number of runs" count on its canvas nodes.
 *
 * Opt-in per service, curated in the catalogue editor. Most operations run once,
 * and the count used to be injected into every node unconditionally, which put a
 * meaningless field on all of them.
 */
export const serviceAllowsMultipleRuns = (service: any): boolean => service?.allowMultipleRuns === true;

/**
 * The run count as the sidebar's parameter list sees it.
 *
 * Deliberately not stored on the service in the database: it is the same field
 * for every service that offers it, so it is composed in on the client instead
 * of being copied into hundreds of catalogue records.
 */
export const RUN_COUNT_PARAM_DEF = {
    id                 : RUN_COUNT_PARAM_ID,
    name               : RUN_COUNT_PARAM_NAME,
    type               : 'number',
    required           : false,
    description        : 'Price = base price × this number.',
    paramType          : 'input',
    isPriceMultiplier  : true,
    options            : null,
    allowMultipleValues: false,
};

/**
 * Whether this service's canvas nodes book lab equipment.
 *
 * Opt-in per service in the catalog editor, and read only at node creation:
 * turning it on never touches a node that already exists (behaviour 4).
 */
export const serviceIsEquipmentUse = (service: any): boolean => service?.equipmentUse === true;

/**
 * The five reserved equipment parameters as the sidebar's parameter list sees them.
 *
 * Deliberately not stored on the service: they are identical for every operation
 * that books equipment, and the ids are the lookup keys the booking and invoicing
 * runs will read. Labels are fixed; no price fields, so the client-facing catalog
 * view is unchanged.
 */
export const EQUIPMENT_PARAM_DEFS: any[] = [
    {
        id                 : EQUIPMENT_START_PARAM_ID,
        name               : EQUIPMENT_PARAM_NAMES[EQUIPMENT_START_PARAM_ID],
        type               : 'date',
        required           : true,
        description        : 'First day of the booking window.',
        paramType          : 'input',
        options            : null,
        allowMultipleValues: false,
    },
    {
        id                 : EQUIPMENT_END_PARAM_ID,
        name               : EQUIPMENT_PARAM_NAMES[EQUIPMENT_END_PARAM_ID],
        type               : 'date',
        required           : true,
        description        : 'Last day of the booking window. Must be on or after the start.',
        paramType          : 'input',
        options            : null,
        allowMultipleValues: false,
    },
    {
        id                 : EQUIPMENT_OPEN_END_PARAM_ID,
        name               : EQUIPMENT_PARAM_NAMES[EQUIPMENT_OPEN_END_PARAM_ID],
        type               : 'boolean',
        required           : false,
        description        : 'Tick if the end date is a best guess rather than a hard stop.',
        paramType          : 'input',
        options            : null,
        allowMultipleValues: false,
    },
    {
        id                 : EQUIPMENT_HOURS_PER_WEEK_PARAM_ID,
        name               : EQUIPMENT_PARAM_NAMES[EQUIPMENT_HOURS_PER_WEEK_PARAM_ID],
        type               : 'number',
        required           : true,
        description        : 'Estimate = hourly rate x this x the number of weeks in the window.',
        paramType          : 'input',
        options            : null,
        allowMultipleValues: false,
    },
    {
        id                 : EQUIPMENT_BOOKERS_PARAM_ID,
        name               : EQUIPMENT_PARAM_NAMES[EQUIPMENT_BOOKERS_PARAM_ID],
        type               : 'emails',
        required           : false,
        description        : 'Who else may book this equipment against this job. Optional.',
        paramType          : 'input',
        options            : null,
        allowMultipleValues: false,
    },
];

/** The value an equipment form entry starts life with, per reserved id. */
const EQUIPMENT_INITIAL_VALUES: Record<string, any> = {
    [EQUIPMENT_START_PARAM_ID]        : '',
    [EQUIPMENT_END_PARAM_ID]          : '',
    [EQUIPMENT_OPEN_END_PARAM_ID]     : false,
    [EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]: '',
    [EQUIPMENT_BOOKERS_PARAM_ID]      : [],
};

/** The same five as form entries, which is where pricing and validation read them from. */
const equipmentFormEntries = (nodeId: string): NodeParameter[] =>
    EQUIPMENT_PARAM_DEFS.map((def) => ({
        id                 : def.id,
        nodeId             : nodeId,
        name               : def.name,
        type               : def.type,
        options            : undefined,
        description        : def.description,
        paramType          : 'input',
        resultParamValue   : '',
        value              : EQUIPMENT_INITIAL_VALUES[def.id],
        required           : def.required,
        dynamicAdd         : false,
        allowMultipleValues: undefined,
        tableData          : null,
    }));

/**
 * The sidebar's parameter list, with the five appended when the node has them.
 * RightSidebar reads this list to pin the group to the top, so a node whose formData
 * carries them but whose parameter list does not gets them buried at the bottom.
 */
export const withEquipmentParams = (serviceParams: any[], include: boolean): any[] => {
    if (!include) return serviceParams;
    // A service that declares one of the ids itself keeps its own definition, for the
    // same reason the run count does: duplicating it would double-count in pricing.
    const missing = EQUIPMENT_PARAM_DEFS.filter((def) => !serviceParams.some((p: any) => p?.id === def.id));
    return missing.length ? [...serviceParams, ...missing] : serviceParams;
};

/** The same field as a form entry, which is where pricing actually reads it from. */
const runCountFormEntry = (nodeId: string): NodeParameter => ({
    id                 : RUN_COUNT_PARAM_ID,
    nodeId             : nodeId,
    name               : RUN_COUNT_PARAM_NAME,
    type               : 'number',
    options            : undefined,
    description        : 'Price = base price × this number.',
    paramType          : 'input',
    resultParamValue   : '',
    value              : 1,
    required           : false,
    dynamicAdd         : false,
    allowMultipleValues: undefined,
    tableData          : null,
    isPriceMultiplier  : true,
});

export const generateFormDataFromParams = (paramsData: any, nodeId: string, options: { includeRunCount?: boolean; includeEquipment?: boolean } = {}): NodeParameter[] => {

    const formData : NodeParameter[] = [];

    for (let i = 0; i < paramsData.length; i++) {
        const parameter = paramsData[i];
        const formId    = Math.random().toString(36).substring(2, 9);
        const allowMultipleValues = !!parameter.allowMultipleValues;
        formData.push({
            id              : parameter.id ?? formId,
            nodeId          : nodeId,
            name            : parameter.name,
            type            : parameter.type,
            options         : parameter.options ? parameter.options    : null,
            description     : parameter.description,
            paramType       : parameter.paramType ? parameter.paramType: null,
            resultParamValue: "",
            value           : allowMultipleValues ? [''] : null,
            required        : parameter.required,
            dynamicAdd : parameter.dynamicAdd ? parameter.dynamicAdd : null,
            allowMultipleValues: allowMultipleValues || undefined,
            tableData : parameter.tableData ? parameter.tableData : null,
            paramGroups: parameter.paramGroups ? parameter.paramGroups : null,
            paramGroupId: parameter.paramGroupId ? parameter.paramGroupId : null,
        });
    }

    // Only for a service that offers multiple runs, and only if it does not
    // already define the entry itself.
    if (options.includeRunCount && !formData.some((p) => p.id === RUN_COUNT_PARAM_ID)) {
        formData.push(runCountFormEntry(nodeId));
    }

    if (options.includeEquipment) {
        for (const entry of equipmentFormEntries(nodeId)) {
            if (!formData.some((p) => p.id === entry.id)) formData.push(entry);
        }
    }

    return formData;
}

/**
 * Everything a newly created canvas node needs from its service: the form
 * entries staff fill in, and the parameter list the sidebar reads to lay them
 * out. The two are kept together because the run count has to land in both — it
 * used to be added to `formData` on every path but to `parameters` on only one,
 * so whether "Number of runs" was pinned to the top of the sidebar depended on
 * whether the node had been dragged in or added from an allowed-connection
 * button.
 *
 * Creation only. Hydrating a saved job goes through mergeSavedFormData, which
 * keeps a stored run count whether or not the service still offers one.
 */
export const buildNodeParameters = (service: any, nodeId: string): { formData: NodeParameter[]; parameters: any[] } => {
    const serviceParams = service?.parameters ?? [];
    const includeRunCount = serviceAllowsMultipleRuns(service);
    const includeEquipment = serviceIsEquipmentUse(service);

    return {
        formData: generateFormDataFromParams(serviceParams, nodeId, { includeRunCount, includeEquipment }),
        parameters: withEquipmentParams(withRunCountParam(serviceParams, includeRunCount), includeEquipment)
    };
}

/**
 * The sidebar's parameter list, with the run count appended when the node has
 * one. RightSidebar reads `isPriceMultiplier` off this list to pin multipliers
 * to the top, so a node whose formData carries a run count but whose parameter
 * list does not gets the field buried at the bottom instead.
 */
export const withRunCountParam = (serviceParams: any[], include: boolean): any[] => {
    if (!include) return serviceParams;
    // A service that declares the id itself keeps its own definition: it may be
    // named and described differently ("Number of plates"), and duplicating it
    // would double-count in pricing.
    if (serviceParams.some((p: any) => p?.id === RUN_COUNT_PARAM_ID)) return serviceParams;
    return [...serviceParams, RUN_COUNT_PARAM_DEF];
}

export const createNodeObject = (id: string, name: string, type: string, position: any, data: NodeData) => {

    const newNode = {
        id: id,
        name,
        type: 'selectorNode',
        position,
        active: true,
        data: data,
    };

    return newNode;
}
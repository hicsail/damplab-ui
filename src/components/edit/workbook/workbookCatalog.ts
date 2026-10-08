import type { ApolloClient } from '@apollo/client';
import {
  CREATE_BUNDLE, CREATE_CATEGORY, CREATE_SERVICE, CREATE_UPLOAD_LOG, GET_BUNDLES, GET_CATEGORIES, GET_PARAMETER_SETS, GET_SERVICES, GET_SOW_PRESET_SECTIONS,
  GET_SOW_TEXT_PRESETS, UPDATE_BUNDLE, UPDATE_CATEGORY, UPDATE_SERVICE
} from '../../../gql/queries';
import { CREATE_PARAMETER_SET, CREATE_SOW_TEXT_PRESET, UPDATE_PARAMETER_SET, UPDATE_SOW_TEXT_PRESET } from '../../../gql/mutations';
import { ownParametersOf } from '../../../utils/serviceParameters';
import type { WorkbookMutator } from './applyWorkbook';
import type { CatalogSnapshot } from './types';

export interface CatalogQueryData {
  services?: any[];
  parameterSets?: any[];
  categories?: any[];
  bundles?: any[];
  sowTextPresets?: any[];
  sowPresetSections?: any[];
}

const list = (value: unknown): any[] => (Array.isArray(value) ? value : []);

/** The six read queries' results as the snapshot the workbook reads. Pure. */
export function catalogSnapshotFrom(data: CatalogQueryData): CatalogSnapshot {
  return {
    operations: list(data.services).map((service) => ({
      ...service,
      id: String(service.id),
      name: String(service.name ?? ''),
      // The list stored on the operation itself — never the effective one, which repeats every set's parameters.
      ownParameters: ownParametersOf(service),
      parameterSetIds: list(service.parameterSetIds).map(String)
    })),
    sets: list(data.parameterSets).map((set) => ({ id: String(set.id), name: String(set.name ?? ''), parameters: list(set.parameters) })),
    categories: list(data.categories).map((category) => ({ id: String(category.id), label: String(category.label ?? ''), serviceIds: list(category.services).map((service) => String(service.id)) })),
    bundles: list(data.bundles).map((bundle) => ({
      id: String(bundle.id),
      label: String(bundle.label ?? ''),
      icon: String(bundle.icon ?? ''),
      steps: list(bundle.services).map((service) => ({ id: String(service.id), name: String(service.name ?? '') }))
    })),
    sowPresets: list(data.sowTextPresets).map((preset) => ({
      id: String(preset.id),
      sectionKey: String(preset.sectionKey ?? ''),
      name: String(preset.name ?? ''),
      text: String(preset.text ?? ''),
      order: Number(preset.order ?? 0)
    })),
    sowSectionKeys: list(data.sowPresetSections).map((section) => String(section.key))
  };
}

/**
 * Everything the workbook reads, fresh from the server. Every query here is
 * open to a catalog-editor:read caller, which is what lets a technician
 * download (the write-gated `catalogExport` is deliberately not used).
 */
export async function loadCatalogSnapshot(client: ApolloClient<unknown>): Promise<CatalogSnapshot> {
  const read = async (query: any): Promise<any> => (await client.query({ query, fetchPolicy: 'network-only' })).data ?? {};
  const [services, sets, categories, bundles, presets, sections] = await Promise.all([
    read(GET_SERVICES), read(GET_PARAMETER_SETS), read(GET_CATEGORIES), read(GET_BUNDLES), read(GET_SOW_TEXT_PRESETS), read(GET_SOW_PRESET_SECTIONS)
  ]);
  return catalogSnapshotFrom({
    services: services.services,
    parameterSets: sets.parameterSets,
    categories: categories.categories,
    bundles: bundles.bundles,
    sowTextPresets: presets.sowTextPresets,
    sowPresetSections: sections.sowPresetSections
  });
}

/** The upload's writes, as the existing mutations. Each is gated server-side on catalog-editor:write. */
export function apolloWorkbookMutator(client: ApolloClient<unknown>): WorkbookMutator {
  const run = async (mutation: any, variables: Record<string, unknown>): Promise<any> => (await client.mutate({ mutation, variables })).data ?? {};
  return {
    createParameterSet: async (parameterSet) => String((await run(CREATE_PARAMETER_SET, { parameterSet })).createParameterSet.id),
    updateParameterSet: async (id, changes) => {
      await run(UPDATE_PARAMETER_SET, { id, changes });
    },
    createService: async (service) => String((await run(CREATE_SERVICE, { service })).createService.id),
    updateService: async (id, changes) => {
      await run(UPDATE_SERVICE, { service: id, changes });
    },
    createCategory: async (category) => String((await run(CREATE_CATEGORY, { category })).createCategory.id),
    updateCategory: async (id, changes) => {
      await run(UPDATE_CATEGORY, { category: id, changes });
    },
    createBundle: async (bundle) => String((await run(CREATE_BUNDLE, { bundle })).createBundle.id),
    updateBundle: async (id, changes) => {
      await run(UPDATE_BUNDLE, { bundle: id, changes });
    },
    createSowTextPreset: async (preset) => String((await run(CREATE_SOW_TEXT_PRESET, { preset })).createSowTextPreset.id),
    updateSowTextPreset: async (id, changes) => {
      await run(UPDATE_SOW_TEXT_PRESET, { id, changes });
    },
    createUploadLog: async (input) => {
      await run(CREATE_UPLOAD_LOG, { input });
    }
  };
}

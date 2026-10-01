import { print } from 'graphql';
import { describe, expect, it } from 'vitest';
import {
  CREATE_SERVICE, GET_CATALOG_EXPORT, GET_CATALOG_SERVICES, GET_DELETED_SERVICE_IDS, GET_PARAMETER_SET, GET_PARAMETER_SETS,
  GET_SERVICES, GET_UPLOAD_LOG, GET_UPLOAD_LOGS, UPDATE_SERVICE
} from './queries';
import { CREATE_PARAMETER_SET, DELETE_PARAMETER_SET, UPDATE_PARAMETER_SET } from './mutations';

const compact = (document: Parameters<typeof print>[0]): string => print(document).replace(/\s+/g, ' ').trim();
const selects = (document: Parameters<typeof print>[0], field: string): boolean => new RegExp(`\\b${field}\\b`).test(compact(document));

describe('Catalog Editor GraphQL contracts', () => {
  it('reads own vs effective parameters, sets and the hidden flag on every service document', () => {
    for (const doc of [GET_SERVICES, UPDATE_SERVICE, CREATE_SERVICE]) {
      for (const field of ['parameters', 'ownParameters', 'parameterSetIds', 'hiddenFromClients']) expect(selects(doc, field)).toBe(true);
    }
    expect(selects(GET_CATALOG_SERVICES, 'hiddenFromClients')).toBe(true);
  });

  it('asks upload logs for their entity type', () => {
    expect(selects(GET_UPLOAD_LOGS, 'entityType')).toBe(true);
    expect(selects(GET_UPLOAD_LOG, 'entityType')).toBe(true);
  });

  it('sends Parameter Set commands through the backend input types', () => {
    expect(compact(CREATE_PARAMETER_SET)).toContain('createParameterSet(parameterSet: $parameterSet)');
    expect(compact(CREATE_PARAMETER_SET)).toContain('$parameterSet: CreateParameterSet!');
    expect(compact(UPDATE_PARAMETER_SET)).toContain('updateParameterSet(id: $id, changes: $changes)');
    expect(compact(UPDATE_PARAMETER_SET)).toContain('$changes: ParameterSetChange!');
    expect(compact(DELETE_PARAMETER_SET)).toContain('deleteParameterSet(id: $id)');
    for (const doc of [GET_PARAMETER_SETS, GET_PARAMETER_SET]) expect(compact(doc)).toMatch(/usedBy \{ id name \}/);
  });

  it('has the lookups the operations upload and catalog download need', () => {
    expect(compact(GET_DELETED_SERVICE_IDS)).toContain('deletedServiceIds');
    expect(compact(GET_CATALOG_EXPORT)).toContain('catalogExport');
  });
});

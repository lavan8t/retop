/**
 * Central Parser Schema Version Registry
 * Used to track schema versions across all HTML parsers to detect DOM migrations
 * and invalidate or migrate stale cached data in IndexedDB/Storage.
 */

export type ParserModuleId =
  | 'attendance'
  | 'timetable'
  | 'marks'
  | 'grades'
  | 'digitalAssignments'
  | 'examSchedule'
  | 'profile'
  | 'curriculum'
  | 'coursePage'
  | 'calendar'
  | 'dashboard'
  | 'menu'
  | 'lateHour'
  | 'events'
  | 'spotlight'
  | 'resources';

export const PARSER_SCHEMA_VERSIONS: Record<ParserModuleId, number> = {
  attendance: 1,
  timetable: 1,
  marks: 1,
  grades: 1,
  digitalAssignments: 1,
  examSchedule: 1,
  profile: 1,
  curriculum: 1,
  coursePage: 1,
  calendar: 1,
  dashboard: 1,
  menu: 1,
  lateHour: 1,
  events: 1,
  spotlight: 1,
  resources: 1,
};

export interface SchemaMetadata {
  _schemaVersion?: number;
  _parsedAt?: number;
}

export type Versioned<T> = T & SchemaMetadata;

/**
 * Wraps an object or array with schema version metadata
 */
export function wrapWithSchemaVersion<T extends object>(
  data: T,
  module: ParserModuleId,
): Versioned<T> {
  if (Array.isArray(data)) {
    // For arrays, attach properties directly
    const versionedArray = Object.assign(data, {
      _schemaVersion: PARSER_SCHEMA_VERSIONS[module],
      _parsedAt: Date.now(),
    });
    return versionedArray as Versioned<T>;
  }
  return {
    ...data,
    _schemaVersion: PARSER_SCHEMA_VERSIONS[module],
    _parsedAt: Date.now(),
  };
}

/**
 * Checks if a cached data structure is missing schema version or is outdated
 */
export function isSchemaStale(
  cachedData: any,
  module: ParserModuleId,
): boolean {
  if (!cachedData || typeof cachedData !== 'object') return true;
  const version = cachedData._schemaVersion ?? 0;
  return version < PARSER_SCHEMA_VERSIONS[module];
}

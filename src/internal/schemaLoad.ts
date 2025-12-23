import { readFile, stat } from "node:fs/promises";
import {
  buildSchema,
  buildClientSchema,
  GraphQLSchema,
  GraphQLType,
  GraphQLField,
  IntrospectionQuery,
} from "graphql";
import { resolve, extname } from "node:path";
import type { Confidence, ToolWarning } from "./types.js";

/**
 * Schema cache entry.
 */
type SchemaCache = {
  schema: GraphQLSchema;
  mtimeMs: number;
  size: number;
  path: string;
};

let schemaCache: SchemaCache | null = null;

/**
 * Load GraphQL schema from SDL file.
 */
async function loadSchemaFromSDL(filePath: string): Promise<GraphQLSchema> {
  const content = await readFile(filePath, "utf-8");
  return buildSchema(content);
}

/**
 * Load GraphQL schema from introspection JSON file.
 * Supports multiple formats:
 * - { data: { __schema: ... } }
 * - { __schema: ... }
 */
async function loadSchemaFromIntrospection(
  filePath: string
): Promise<GraphQLSchema> {
  const content = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(content) as
    | IntrospectionQuery
    | { data: IntrospectionQuery }
    | { __schema: IntrospectionQuery["__schema"] };

  // Normalize to introspection query result format that buildClientSchema expects
  // buildClientSchema expects { __schema: ... } directly (IntrospectionQuery type)
  // But when wrapped as { data: { __schema: ... } }, we need to unwrap it
  let introspection: IntrospectionQuery;
  if ("data" in parsed && parsed.data) {
    // Wrapped format: { data: { __schema: ... } }
    introspection = parsed.data;
  } else if ("__schema" in parsed && !("data" in parsed)) {
    // Direct format: { __schema: ... } - already in correct format
    introspection = parsed as unknown as IntrospectionQuery;
  } else {
    // Assume it's already an IntrospectionQuery
    introspection = parsed as IntrospectionQuery;
  }

  return buildClientSchema(introspection);
}

/**
 * Load and cache GraphQL schema, invalidating on file change.
 * Supports both SDL (.graphql) and introspection JSON (.json) formats.
 *
 * @param schemaPath - Path to schema file
 * @returns Schema with confidence and optional warnings
 */
export async function loadSchema(schemaPath: string): Promise<{
  schema: GraphQLSchema;
  confidence: Confidence;
  warnings?: ToolWarning[];
}> {
  try {
    const resolvedPath = resolve(schemaPath);
    const stats = await stat(resolvedPath);
    const mtimeMs = stats.mtime.getTime();
    const size = stats.size;

    // Check cache (keyed by path + mtimeMs + size)
    if (
      schemaCache &&
      schemaCache.path === resolvedPath &&
      schemaCache.mtimeMs === mtimeMs &&
      schemaCache.size === size
    ) {
      return { schema: schemaCache.schema, confidence: "high" };
    }

    // Determine format by extension
    const ext = extname(resolvedPath).toLowerCase();
    let schema: GraphQLSchema;

    if (ext === ".json") {
      // Introspection JSON
      try {
        schema = await loadSchemaFromIntrospection(resolvedPath);
      } catch (error) {
        // If introspection fails, try as SDL (some .json files might be SDL)
        try {
          schema = await loadSchemaFromSDL(resolvedPath);
        } catch {
          throw error; // Re-throw original introspection error
        }
      }
    } else if (ext === ".graphql" || ext === ".gql") {
      // SDL
      schema = await loadSchemaFromSDL(resolvedPath);
    } else {
      // Try SDL first, fallback to JSON
      try {
        schema = await loadSchemaFromSDL(resolvedPath);
      } catch {
        schema = await loadSchemaFromIntrospection(resolvedPath);
      }
    }

    // Update cache with new schema
    schemaCache = {
      schema,
      mtimeMs,
      size,
      path: resolvedPath,
    };

    return { schema, confidence: "high" };
  } catch (error) {
    return {
      schema: buildSchema("type Query { _: String }"),
      confidence: "low",
      warnings: [
        {
          code: "SCHEMA_LOAD_ERROR",
          message: `Failed to load schema: ${
            error instanceof Error ? error.message : String(error)
          }. Supported formats: .graphql (SDL) or .json (introspection).`,
        },
      ],
    };
  }
}

/**
 * Lookup a type by name.
 *
 * @param schema - GraphQL schema
 * @param typeName - Type name to lookup
 * @returns GraphQL type or null if not found
 */
export function lookupType(
  schema: GraphQLSchema,
  typeName: string
): GraphQLType | null {
  const type = schema.getType(typeName);
  return type ?? null;
}

/**
 * Lookup a field on a type.
 *
 * @param schema - GraphQL schema
 * @param typeName - Parent type name
 * @param fieldName - Field name to lookup
 * @returns GraphQL field or null if not found
 */
export function lookupField(
  schema: GraphQLSchema,
  typeName: string,
  fieldName: string
): GraphQLField<unknown, unknown> | null {
  const type = schema.getType(typeName);
  if (!type || !("getFields" in type)) {
    return null;
  }
  const fields = type.getFields();
  const field = fields[fieldName];
  // Only return GraphQLField (not GraphQLInputField which doesn't have args)
  if (!field || !("args" in field)) {
    return null;
  }
  return field as GraphQLField<unknown, unknown>;
}

/**
 * Search for types containing a substring.
 *
 * @param schema - GraphQL schema
 * @param searchTerm - Substring to search for
 * @returns Array of matching type names
 */
export function searchTypes(
  schema: GraphQLSchema,
  searchTerm: string
): string[] {
  const typeMap = schema.getTypeMap();
  const matches: string[] = [];
  const lowerSearch = searchTerm.toLowerCase();

  for (const [name, type] of Object.entries(typeMap)) {
    // Skip internal types
    if (name.startsWith("__")) {
      continue;
    }
    if (name.toLowerCase().includes(lowerSearch)) {
      matches.push(name);
    }
  }

  return matches.sort();
}

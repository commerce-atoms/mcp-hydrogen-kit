import type {
  CallToolRequest,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import {
  loadSchema,
  lookupType,
  lookupField,
  searchTypes,
} from "../internal/schemaLoad.js";
import type { ToolResult } from "../internal/types.js";
import { GraphQLObjectType, GraphQLField } from "graphql";

export type SchemaLookupInput = {
  rootDir: string; // Injected by server from config
  schemaPath?: string; // Optional override, defaults to server config
  typeName?: string;
  fieldRef?: string; // "Product.variants"
  search?: string; // substring search on types
};

export type SchemaLookupOutput =
  | {
      kind: "type";
      name: string;
      fields: Array<{
        name: string;
        returnType: string;
        args: Array<{ name: string; type: string }>;
      }>;
    }
  | {
      kind: "field";
      parentType: string;
      name: string;
      returnType: string;
      args: Array<{ name: string; type: string }>;
    }
  | {
      kind: "search";
      matches: string[];
    };

export const storefrontSchemaLookup = {
  name: "storefront.schema.lookup",
  description:
    "Lookup Storefront API GraphQL schema types, fields, or search for types by name. Supports SDL (.graphql) and introspection JSON (.json) formats.",
  inputSchema: {
    type: "object",
    properties: {
      schemaPath: {
        type: "string",
        description:
          "Path to the GraphQL schema file (SDL or introspection JSON). Optional if configured via MCP_SCHEMA_PATH.",
      },
      typeName: {
        type: "string",
        description: "Lookup a specific type by name",
      },
      fieldRef: {
        type: "string",
        description: 'Lookup a field (format: "TypeName.fieldName")',
      },
      search: {
        type: "string",
        description: "Search for types containing this substring",
      },
    },
    required: [],
  },
  handler: async (request: CallToolRequest): Promise<CallToolResult> => {
    const { rootDir, schemaPath, typeName, fieldRef, search } =
      request.params as unknown as SchemaLookupInput;

    if (!schemaPath) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: false,
              error: {
                code: "MISSING_SCHEMA_PATH",
                message:
                  "schemaPath is required. Provide it in the tool call or configure MCP_SCHEMA_PATH.",
              },
              confidence: "low",
            } satisfies ToolResult<SchemaLookupOutput>),
          },
        ],
      };
    }

    const { schema, confidence, warnings } = await loadSchema(schemaPath);

    // Validate exactly one of typeName, fieldRef, or search is provided
    const provided = [typeName, fieldRef, search].filter(Boolean).length;
    if (provided === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: false,
              error: {
                code: "MISSING_QUERY",
                message:
                  "Must provide exactly one of: typeName, fieldRef, or search",
              },
              confidence: "low",
            } satisfies ToolResult<SchemaLookupOutput>),
          },
        ],
      };
    }
    if (provided > 1) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: false,
              error: {
                code: "SCHEMA_LOOKUP_AMBIGUOUS_INPUT",
                message:
                  "Must provide exactly one of: typeName, fieldRef, or search. Multiple provided.",
              },
              confidence: "low",
            } satisfies ToolResult<SchemaLookupOutput>),
          },
        ],
      };
    }

    // Search mode
    if (search) {
      const matches = searchTypes(schema, search);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: true,
              data: {
                kind: "search",
                matches,
              },
              confidence,
              warnings,
            } satisfies ToolResult<SchemaLookupOutput>),
          },
        ],
      };
    }

    // Field lookup mode
    if (fieldRef) {
      const [parentTypeName, fieldName] = fieldRef.split(".");
      if (!parentTypeName || !fieldName) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: false,
                error: {
                  code: "INVALID_FIELD_REF",
                  message: 'fieldRef must be in format "TypeName.fieldName"',
                },
                confidence: "low",
              } satisfies ToolResult<SchemaLookupOutput>),
            },
          ],
        };
      }

      const field = lookupField(schema, parentTypeName, fieldName);
      if (!field) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: false,
                error: {
                  code: "FIELD_NOT_FOUND",
                  message: `Field ${fieldRef} not found in schema`,
                },
                confidence: "medium",
                warnings,
              } satisfies ToolResult<SchemaLookupOutput>),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: true,
              data: {
                kind: "field",
                parentType: parentTypeName,
                name: fieldName,
                returnType: field.type.toString(),
                args: field.args.map((arg) => ({
                  name: arg.name,
                  type: arg.type.toString(),
                })),
              },
              confidence,
              warnings,
            } satisfies ToolResult<SchemaLookupOutput>),
          },
        ],
      };
    }

    // Type lookup mode
    if (typeName) {
      const type = lookupType(schema, typeName);
      if (!type) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: false,
                error: {
                  code: "TYPE_NOT_FOUND",
                  message: `Type ${typeName} not found in schema`,
                },
                confidence: "medium",
                warnings,
              } satisfies ToolResult<SchemaLookupOutput>),
            },
          ],
        };
      }

      if (!(type instanceof GraphQLObjectType)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: false,
                error: {
                  code: "NOT_OBJECT_TYPE",
                  message: `Type ${typeName} is not an object type`,
                },
                confidence: "medium",
                warnings,
              } satisfies ToolResult<SchemaLookupOutput>),
            },
          ],
        };
      }

      const fields = type.getFields();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: true,
              data: {
                kind: "type",
                name: typeName,
                fields: Object.values(fields).map((field) => ({
                  name: field.name,
                  returnType: field.type.toString(),
                  args: field.args.map((arg) => ({
                    name: arg.name,
                    type: arg.type.toString(),
                  })),
                })),
              },
              confidence,
              warnings,
            } satisfies ToolResult<SchemaLookupOutput>),
          },
        ],
      };
    }

    // No query specified
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ok: false,
            error: {
              code: "MISSING_QUERY",
              message: "Must provide one of: typeName, fieldRef, or search",
            },
            confidence: "low",
          } satisfies ToolResult<SchemaLookupOutput>),
        },
      ],
    };
  },
};

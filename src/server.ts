import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { AppConfig } from "./config.js";
import { codebaseRoutesList } from "./tools/codebase.routes.list.js";
import { codebaseFileOutline } from "./tools/codebase.file.outline.js";
import { storefrontSchemaLookup } from "./tools/storefront.schema.lookup.js";
import { architectureGraphQLValidatePlacement } from "./tools/architecture.graphql.validatePlacement.js";

/**
 * Creates and configures the MCP server with all tools.
 *
 * @param config - Application configuration
 * @returns Configured MCP server instance
 */
export async function createServer(config: AppConfig): Promise<McpServer> {
  const server = new McpServer(
    {
      name: "mcp-hydrogen-kit",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool handlers (using underlying Server instance)
  server.server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: codebaseRoutesList.name,
          description: codebaseRoutesList.description,
          inputSchema: codebaseRoutesList.inputSchema,
        },
        {
          name: codebaseFileOutline.name,
          description: codebaseFileOutline.description,
          inputSchema: codebaseFileOutline.inputSchema,
        },
        {
          name: storefrontSchemaLookup.name,
          description: storefrontSchemaLookup.description,
          inputSchema: storefrontSchemaLookup.inputSchema,
        },
        {
          name: architectureGraphQLValidatePlacement.name,
          description: architectureGraphQLValidatePlacement.description,
          inputSchema: architectureGraphQLValidatePlacement.inputSchema,
        },
      ],
    };
  });

  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const params = request.params as {
      name: string;
      arguments?: Record<string, unknown>;
    };

    const { name, arguments: args = {} } = params;

    // Inject config.rootDir into all tool calls (overrides any client-provided rootDir)
    const argsWithConfig = { ...args, rootDir: config.rootDir };

    // Route to appropriate handler
    if (name === codebaseRoutesList.name) {
      return await codebaseRoutesList.handler({
        ...request,
        params: argsWithConfig,
      } as any);
    }
    if (name === codebaseFileOutline.name) {
      return await codebaseFileOutline.handler({
        ...request,
        params: argsWithConfig,
      } as any);
    }
    if (name === storefrontSchemaLookup.name) {
      return await storefrontSchemaLookup.handler({
        ...request,
        params: {
          ...argsWithConfig,
          schemaPath: args.schemaPath || config.schemaPath,
        },
      } as any);
    }
    if (name === architectureGraphQLValidatePlacement.name) {
      return await architectureGraphQLValidatePlacement.handler({
        ...request,
        params: argsWithConfig,
      } as any);
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}

/**
 * Starts the MCP server with stdio transport.
 *
 * @param config - Application configuration
 */
export async function startServer(config: AppConfig): Promise<void> {
  const server = await createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

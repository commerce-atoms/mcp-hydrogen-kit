import type {
  CallToolRequest,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { AppConfig } from "../config.js";
import { parseRoutes } from "../internal/routesParse.js";
import type { ToolResult } from "../internal/types.js";

export type RoutesListInput = {
  rootDir: string; // Injected by server from config
  routesFile?: string;
};

export type RoutesListOutput = {
  routes: Array<{
    pattern: string;
    file: string;
    kind: "route" | "resource" | "layout";
    moduleGuess?: string;
  }>;
};

export const codebaseRoutesList = {
  name: "codebase.routes.list",
  description:
    "List all routes defined in the Hydrogen codebase route manifest.",
  inputSchema: {
    type: "object",
    properties: {
      routesFile: {
        type: "string",
        description: "Path to routes.ts file (default: app/routes.ts)",
        default: "app/routes.ts",
      },
    },
    required: [],
  },
  handler: async (request: CallToolRequest): Promise<CallToolResult> => {
    const { rootDir, routesFile } =
      request.params as unknown as RoutesListInput;
    const config: AppConfig = {
      rootDir,
      defaultRoutesFile: routesFile || "app/routes.ts",
    };

    const result = await parseRoutes(rootDir, config.defaultRoutesFile);

    if (result.routes.length === 0 && result.confidence === "low") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: false,
              error: {
                code: "NO_ROUTES_FOUND",
                message: "No routes found in the routes file",
              },
              confidence: result.confidence,
              warnings: result.warnings,
            } satisfies ToolResult<RoutesListOutput>),
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
              routes: result.routes,
            },
            confidence: result.confidence,
            warnings: result.warnings,
          } satisfies ToolResult<RoutesListOutput>),
        },
      ],
    };
  },
};

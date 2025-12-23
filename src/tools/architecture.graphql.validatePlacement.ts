import type {
  CallToolRequest,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { parseRoutes } from "../internal/routesParse.js";
import type { ToolResult } from "../internal/types.js";
import { resolve } from "node:path";

export type ValidatePlacementInput = {
  rootDir: string; // Injected by server from config
  consumerFilePath: string;
  queryFilePath: string;
  sharedAllowlist?: string[]; // default ["app/shared"]
};

export type ValidatePlacementOutput = {
  status: "pass" | "warn" | "fail";
  owner: {
    kind: "module" | "platform" | "layout" | "unknown";
    name?: string; // module name
  };
  violations: Array<{
    code: string;
    message: string;
    evidence?: { file: string }[];
  }>;
  suggestedFixes: Array<{
    action: "move" | "keep" | "extract" | "unknown";
    toPath?: string;
    rationale: string;
  }>;
};

type OwnerInfo = {
  kind: "module" | "platform" | "layout" | "unknown";
  name?: string;
};

/**
 * Infer owner from file path.
 */
function inferOwner(filePath: string): OwnerInfo {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, "/");

  // Module owner
  const moduleMatch = normalized.match(/\/modules\/([^/]+)\//);
  if (moduleMatch) {
    return {
      kind: "module",
      name: moduleMatch[1],
    };
  }

  // Platform owner
  if (normalized.includes("/platform/")) {
    return {
      kind: "platform",
    };
  }

  // Layout owner
  if (normalized.includes("/layout/")) {
    return {
      kind: "layout",
    };
  }

  return {
    kind: "unknown",
  };
}

/**
 * Validate GraphQL query placement against architecture rules.
 *
 * @param rootDir - Root directory for file operations
 * @param consumerFilePath - File that consumes the query
 * @param queryFilePath - GraphQL query file location
 * @param sharedAllowlist - Paths allowed for shared queries
 * @returns Validation result with status, owner, violations, and suggested fixes
 */
export async function validatePlacement(
  rootDir: string,
  consumerFilePath: string,
  queryFilePath: string,
  sharedAllowlist: string[]
): Promise<{
  status: "pass" | "warn" | "fail";
  owner: OwnerInfo;
  violations: ValidatePlacementOutput["violations"];
  suggestedFixes: ValidatePlacementOutput["suggestedFixes"];
  confidence: "high" | "medium" | "low";
}> {
  const consumerOwner = inferOwner(consumerFilePath);
  const queryOwner = inferOwner(queryFilePath);

  const violations: ValidatePlacementOutput["violations"] = [];
  const suggestedFixes: ValidatePlacementOutput["suggestedFixes"] = [];

  // Normalize paths for comparison
  const normalizedQuery = queryFilePath.replace(/\\/g, "/");
  const normalizedConsumer = consumerFilePath.replace(/\\/g, "/");

  // Rule 1: Module consumer with query in same module => PASS
  if (
    consumerOwner.kind === "module" &&
    queryOwner.kind === "module" &&
    consumerOwner.name === queryOwner.name
  ) {
    return {
      status: "pass",
      owner: consumerOwner,
      violations: [],
      suggestedFixes: [],
      confidence: "high",
    };
  }

  // Rule 2: Module consumer with query in different module => FAIL
  if (
    consumerOwner.kind === "module" &&
    queryOwner.kind === "module" &&
    consumerOwner.name !== queryOwner.name
  ) {
    violations.push({
      code: "CROSS_MODULE_QUERY",
      message: `Module "${consumerOwner.name}" cannot import query from module "${queryOwner.name}"`,
      evidence: [{ file: consumerFilePath }, { file: queryFilePath }],
    });

    suggestedFixes.push({
      action: "move",
      toPath: `app/modules/${consumerOwner.name}/graphql/${queryFilePath
        .split("/")
        .pop()}`,
      rationale: `Move query into the consuming module's graphql directory to maintain module boundaries`,
    });

    return {
      status: "fail",
      owner: consumerOwner,
      violations,
      suggestedFixes,
      confidence: "high",
    };
  }

  // Rule 3: Module consumer with query in allowlist => WARN
  const isInAllowlist = sharedAllowlist.some((allowed) =>
    normalizedQuery.includes(allowed.replace(/\\/g, "/"))
  );
  if (consumerOwner.kind === "module" && isInAllowlist) {
    violations.push({
      code: "SHARED_QUERY_WARNING",
      message: `Module "${consumerOwner.name}" is using a shared query. Consider moving it into the module if it's module-specific.`,
      evidence: [{ file: queryFilePath }],
    });

    suggestedFixes.push({
      action: "keep",
      rationale:
        "Shared queries are acceptable but may indicate a need for module-specific queries",
    });

    return {
      status: "warn",
      owner: consumerOwner,
      violations,
      suggestedFixes,
      confidence: "medium",
    };
  }

  // Rule 4: Platform/Layout consumer with query in module => FAIL
  if (
    (consumerOwner.kind === "platform" || consumerOwner.kind === "layout") &&
    queryOwner.kind === "module"
  ) {
    violations.push({
      code: "PLATFORM_MODULE_QUERY",
      message: `${consumerOwner.kind} code cannot import queries from modules`,
      evidence: [{ file: consumerFilePath }, { file: queryFilePath }],
    });

    suggestedFixes.push({
      action: "move",
      toPath: `app/${consumerOwner.kind}/graphql/${queryFilePath
        .split("/")
        .pop()}`,
      rationale: `Move query to ${consumerOwner.kind} directory or extract to platform if truly shared`,
    });

    return {
      status: "fail",
      owner: consumerOwner,
      violations,
      suggestedFixes,
      confidence: "high",
    };
  }

  // Rule 5: Unknown owner => WARN
  if (consumerOwner.kind === "unknown") {
    violations.push({
      code: "UNKNOWN_OWNER",
      message: "Could not determine owner of consumer file",
      evidence: [{ file: consumerFilePath }],
    });

    return {
      status: "warn",
      owner: consumerOwner,
      violations,
      suggestedFixes: [],
      confidence: "low",
    };
  }

  // Default: pass (e.g., platform/platform, layout/layout)
  return {
    status: "pass",
    owner: consumerOwner,
    violations: [],
    suggestedFixes: [],
    confidence: "high",
  };
}

export const architectureGraphQLValidatePlacement = {
  name: "architecture.graphql.validatePlacement",
  description:
    "Validate whether a GraphQL query file is placed correctly given the consumer file path, enforcing module boundaries.",
  inputSchema: {
    type: "object",
    properties: {
      consumerFilePath: {
        type: "string",
        description: "Path to the file that consumes the query",
      },
      queryFilePath: {
        type: "string",
        description: "Path to the GraphQL query file",
      },
      sharedAllowlist: {
        type: "array",
        items: { type: "string" },
        description: "Paths that are allowed to contain shared queries",
        default: ["app/shared"],
      },
    },
    required: ["consumerFilePath", "queryFilePath"],
  },
  handler: async (request: CallToolRequest): Promise<CallToolResult> => {
    const {
      rootDir,
      consumerFilePath,
      queryFilePath,
      sharedAllowlist = ["app/shared"],
    } = request.params as unknown as ValidatePlacementInput;

    const result = await validatePlacement(
      rootDir,
      consumerFilePath,
      queryFilePath,
      sharedAllowlist
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ok: true,
            data: {
              status: result.status,
              owner: result.owner,
              violations: result.violations,
              suggestedFixes: result.suggestedFixes,
            },
            confidence: result.confidence,
          } satisfies ToolResult<ValidatePlacementOutput>),
        },
      ],
    };
  },
};

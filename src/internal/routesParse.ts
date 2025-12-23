import * as ts from "typescript";
import { readTextFile } from "./fs.js";
import type { Confidence, ToolWarning } from "./types.js";

/**
 * Route information extracted from route manifest.
 */
export type RouteInfo = {
  pattern: string;
  file: string;
  kind: "route" | "resource" | "layout";
  moduleGuess?: string;
};

/**
 * Result of parsing routes from a routes file.
 */
export type RoutesParseResult = {
  routes: RouteInfo[];
  confidence: Confidence;
  warnings?: ToolWarning[];
};

/**
 * Extract module name from file path.
 */
function extractModuleName(filePath: string): string | undefined {
  const match = filePath.match(/\/modules\/([^/]+)\//);
  return match ? match[1] : undefined;
}

/**
 * Determine route kind from file path.
 */
function determineKind(filePath: string): "route" | "resource" | "layout" {
  if (
    filePath.includes("/platform/routing/") ||
    filePath.endsWith(".route.ts")
  ) {
    return "resource";
  }
  if (filePath.includes("/layout/")) {
    return "layout";
  }
  return "route";
}

/**
 * Parse routes using TypeScript AST.
 */
async function parseRoutesAST(
  sourceText: string,
  fileName: string
): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "route"
    ) {
      const args = node.arguments;
      if (args.length >= 2) {
        const patternArg = args[0];
        const fileArg = args[1];

        let pattern: string | undefined;
        let file: string | undefined;

        if (ts.isStringLiteral(patternArg)) {
          pattern = patternArg.text;
        }

        if (ts.isStringLiteral(fileArg)) {
          file = fileArg.text;
        }

        if (pattern && file) {
          routes.push({
            pattern,
            file,
            kind: determineKind(file),
            moduleGuess: extractModuleName(file),
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routes;
}

function parseRoutesRegex(sourceText: string): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const regex =
    /route\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let match;

  while ((match = regex.exec(sourceText)) !== null) {
    const pattern = match[1];
    const file = match[2];
    routes.push({
      pattern,
      file,
      kind: determineKind(file),
      moduleGuess: extractModuleName(file),
    });
  }

  return routes;
}

/**
 * Parse routes from a routes.ts file.
 *
 * @param rootDir - Root directory for file operations
 * @param routesFile - Path to routes file (relative to rootDir)
 * @returns Parsed routes with confidence and warnings
 */
export async function parseRoutes(
  rootDir: string,
  routesFile: string
): Promise<RoutesParseResult> {
  try {
    const sourceText = await readTextFile(rootDir, routesFile);
    let routes: RouteInfo[];
    let confidence: Confidence = "high";
    const warnings: ToolWarning[] = [];

    try {
      routes = await parseRoutesAST(sourceText, routesFile);
      if (routes.length === 0) {
        warnings.push({
          code: "ROUTES_PARSE_FALLBACK_REGEX",
          message:
            "AST parsing found no routes, falling back to regex. Regex may match commented code or unrelated functions.",
        });
        routes = parseRoutesRegex(sourceText);
        confidence = "low";
      } else if (routes.length < 3) {
        confidence = "medium";
        warnings.push({
          code: "PARTIAL_PARSE",
          message: "AST parsing found fewer routes than expected",
        });
      }
    } catch (error) {
      warnings.push({
        code: "ROUTES_PARSE_FALLBACK_REGEX",
        message: `AST parsing failed: ${
          error instanceof Error ? error.message : String(error)
        }. Falling back to regex which may match commented code, template strings, or unrelated functions.`,
      });
      routes = parseRoutesRegex(sourceText);
      confidence = "low";
    }

    return {
      routes,
      confidence,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      routes: [],
      confidence: "low",
      warnings: [
        {
          code: "FILE_READ_ERROR",
          message: `Failed to read routes file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}

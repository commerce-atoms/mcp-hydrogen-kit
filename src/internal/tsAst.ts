import * as ts from "typescript";
import { readTextFile } from "./fs.js";
import type { Confidence, ToolWarning } from "./types.js";

/**
 * File structure outline (imports, exports, symbols).
 */
export type FileOutline = {
  imports: string[];
  exports: {
    default?: string;
    named: string[];
  };
  symbols: {
    functions: string[];
    types: string[];
    classes: string[];
    consts: string[];
  };
};

/**
 * Result of parsing file outline.
 */
export type OutlineResult = {
  outline: FileOutline;
  confidence: Confidence;
  warnings?: ToolWarning[];
};

function extractImports(sourceFile: ts.SourceFile): string[] {
  const imports: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push(node.moduleSpecifier.text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

/**
 * Extract exports and symbols from source file.
 */
function extractExportsAndSymbols(sourceFile: ts.SourceFile): {
  exports: { default?: string; named: string[] };
  symbols: {
    functions: string[];
    types: string[];
    classes: string[];
    consts: string[];
  };
} {
  const exports: { default?: string; named: string[] } = { named: [] };
  const symbols = {
    functions: [] as string[],
    types: [] as string[],
    classes: [] as string[],
    consts: [] as string[],
  };

  function visit(node: ts.Node, isTopLevel = true) {
    // Default exports
    if (ts.isExportAssignment(node)) {
      if (ts.isIdentifier(node.expression)) {
        exports.default = node.expression.text;
      }
    }

    // Named exports and declarations
    if (isTopLevel) {
      // Export default function/const
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        ts
          .getModifiers(node)
          ?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
      ) {
        exports.default = node.name.text;
        symbols.functions.push(node.name.text);
      }

      // Export default const/class
      if (
        (ts.isVariableStatement(node) || ts.isClassDeclaration(node)) &&
        ts
          .getModifiers(node)
          ?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
      ) {
        if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach((decl) => {
            if (ts.isIdentifier(decl.name)) {
              exports.default = decl.name.text;
              symbols.consts.push(decl.name.text);
            }
          });
        } else if (node.name) {
          exports.default = node.name.text;
          symbols.classes.push(node.name.text);
        }
      }

      // Named exports
      if (ts.isExportDeclaration(node)) {
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach((element) => {
            exports.named.push(element.name.text);
          });
        }
      }

      // Function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        if (!symbols.functions.includes(name)) {
          symbols.functions.push(name);
        }
        if (
          ts
            .getModifiers(node)
            ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
          !exports.named.includes(name)
        ) {
          exports.named.push(name);
        }
      }

      // Class declarations
      if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        if (!symbols.classes.includes(name)) {
          symbols.classes.push(name);
        }
        if (
          ts
            .getModifiers(node)
            ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
          !exports.named.includes(name)
        ) {
          exports.named.push(name);
        }
      }

      // Type/interface declarations
      if (
        (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
        node.name
      ) {
        const name = node.name.text;
        if (!symbols.types.includes(name)) {
          symbols.types.push(name);
        }
        if (
          ts
            .getModifiers(node)
            ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
          !exports.named.includes(name)
        ) {
          exports.named.push(name);
        }
      }

      // Const/let/var declarations
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach((decl) => {
          if (ts.isIdentifier(decl.name)) {
            const name = decl.name.text;
            if (!symbols.consts.includes(name)) {
              symbols.consts.push(name);
            }
            if (
              ts
                .getModifiers(node)
                ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
              !exports.named.includes(name)
            ) {
              exports.named.push(name);
            }
          }
        });
      }
    }

    ts.forEachChild(node, (child) => visit(child, false));
  }

  // Visit source file with isTopLevel=true for top-level declarations
  ts.forEachChild(sourceFile, (child) => visit(child, true));
  return { exports, symbols };
}

/**
 * Parse file outline using TypeScript AST.
 *
 * @param rootDir - Root directory for file operations
 * @param filePath - Path to file (relative to rootDir)
 * @returns File outline with confidence and optional warnings
 */
export async function parseFileOutline(
  rootDir: string,
  filePath: string
): Promise<OutlineResult> {
  try {
    const sourceText = await readTextFile(rootDir, filePath);
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    const imports = extractImports(sourceFile);
    const { exports, symbols } = extractExportsAndSymbols(sourceFile);

    return {
      outline: {
        imports,
        exports,
        symbols,
      },
      confidence: "high",
    };
  } catch (error) {
    return {
      outline: {
        imports: [],
        exports: { named: [] },
        symbols: {
          functions: [],
          types: [],
          classes: [],
          consts: [],
        },
      },
      confidence: "low",
      warnings: [
        {
          code: "PARSE_ERROR",
          message: `Failed to parse file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}

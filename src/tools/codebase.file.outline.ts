import type {
  CallToolRequest,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { parseFileOutline } from "../internal/tsAst.js";
import type { ToolResult } from "../internal/types.js";

export type FileOutlineInput = {
  rootDir: string; // Injected by server from config
  filePath: string;
};

export type FileOutlineOutput = {
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

export const codebaseFileOutline = {
  name: "codebase.file.outline",
  description:
    "Get an outline of a TypeScript/TSX file (imports, exports, symbols) without returning file bodies.",
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Relative path to the file to outline",
      },
    },
    required: ["filePath"],
  },
  handler: async (request: CallToolRequest): Promise<CallToolResult> => {
    const { rootDir, filePath } = request.params as unknown as FileOutlineInput;

    const result = await parseFileOutline(rootDir, filePath);

    if (result.confidence === "low" && result.warnings) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: false,
              error: {
                code: "PARSE_FAILED",
                message: result.warnings[0]?.message || "Failed to parse file",
              },
              confidence: result.confidence,
              warnings: result.warnings,
            } satisfies ToolResult<FileOutlineOutput>),
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
            data: result.outline,
            confidence: result.confidence,
            warnings: result.warnings,
          } satisfies ToolResult<FileOutlineOutput>),
        },
      ],
    };
  },
};

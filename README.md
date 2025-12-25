# MCP Hydrogen Kit

> **Read-only MCP tools for Shopify Hydrogen.**  
> Route discovery, file outlining, schema lookup, and architecture validation.  
> Built for AI agents that respect boundaries.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

> ⚠️ **Warning: Alpha / Not Fully Tested**  
> This project is in early development and has not been fully tested in production environments.  
> Use at your own risk and report issues if you encounter problems.

A read-only MCP server that helps AI agents and developers work safely in Shopify Hydrogen codebases. Focuses on **developer ergonomics and architecture correctness**, not shopping assistants.

---

## ✨ Features

- 🗺️ **Route Discovery** - Parse and list routes from explicit route manifests
- 📄 **File Outlining** - Extract imports, exports, and symbols without returning file bodies
- 🔍 **Schema Lookup** - Query GraphQL Storefront API schema (SDL or introspection JSON)
- 🛡️ **Architecture Validation** - Enforce module boundaries for GraphQL query placement

**Non-goals**

- ❌ Modify files, apply patches, or write code
- ❌ Validate business logic or runtime correctness

---

## 🎯 Why This Exists

AI agents in large codebases waste time and break architecture because they:

- Cannot quickly map routes → files
- Cannot safely outline code without reading entire files
- Hallucinate Shopify Storefront API GraphQL fields/args
- Place GraphQL queries in the wrong layer/module

**Shopify's Storefront MCP** tells you what's valid in the Storefront API.  
**This toolkit** tells you what's **allowed and sane inside a Hydrogen codebase**.

All tools return structured results with confidence levels and warnings when heuristics or fallbacks are used.

---

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/commerce-atoms/mcp-hydrogen-kit.git
cd mcp-hydrogen-kit
npm install
npm run build
```

### 1. Configure Environment

```bash
export MCP_ROOT_DIR=/path/to/your/hydrogen/project
export MCP_SCHEMA_PATH=/path/to/storefront.schema.graphql
```

`MCP_SCHEMA_PATH` points to the Storefront API schema (SDL or introspection JSON), not to application query files. Queries may be distributed across modules.

### 2. Run the Server

```bash
npm run dev
```

### 3. Integrate with Your MCP Client

- **[Cursor](./docs/cursor.md)** - Setup guide for Cursor
- **[Claude Desktop](./docs/claude-desktop.md)** - Setup guide for Claude Desktop

---

## 🛠️ Tools

### `codebase.routes.list`

List all routes from the route manifest (`app/routes.ts`).

**Input:**

- `routesFile` (optional) - Path to routes file, defaults to `app/routes.ts`

**Output:**

- Array of routes with pattern, file path, kind, and module guess

### `codebase.file.outline`

Get file structure (imports, exports, symbols) without returning file bodies.

**Input:**

- `filePath` - Relative path to the file

**Output:**

- Imports, exports (default + named), and symbols (functions, types, classes, consts)

### `storefront.schema.lookup`

Lookup GraphQL schema types, fields, or search for types by name.

**Input:**

- `schemaPath` (optional) - Path to schema file, defaults to `MCP_SCHEMA_PATH`
- One of: `typeName`, `fieldRef` (e.g., `"Product.variants"`), or `search`

**Output:**

- Type details, field details, or search matches

**Supported formats:** SDL (`.graphql`) and introspection JSON (`.json`)

### `architecture.graphql.validatePlacement`

Validate whether a GraphQL query file is placed correctly given the consumer file path.

**Input:**

- `consumerFilePath` - File that consumes the query
- `queryFilePath` - GraphQL query file location
- `sharedAllowlist` (optional) - Paths allowed for shared queries, defaults to `["app/shared"]`

**Output:**

- Status (pass/warn/fail), owner, violations, and suggested fixes

---

## 📋 Requirements

- Node.js 18+
- TypeScript (for this toolchain; target project may be TS or JS)
- Hydrogen project with explicit routing (`app/routes.ts`)
- GraphQL schema file (SDL `.graphql` or introspection JSON `.json`)

**Compatibility**: This toolkit is optimized for Hydrogen codebases with explicit route manifests and module-oriented layouts. Other structures are supported on a best-effort basis with reduced confidence.

---

## 🔒 Safety

This MCP server is **read-only** and sandboxed:

- All file reads stay within an explicit `rootDir`
- Path traversal and symlink escapes are prevented
- No shell execution
- No network requests
- Deterministic JSON outputs

See [docs/safety.md](./docs/safety.md) for details.

---

## 🧪 Development

```bash
npm test          # Run tests
npm run typecheck # Type check
npm run ci        # Type check + test
npm run build     # Build for production
```

---

## 📝 License

[MIT](LICENSE) — Free to use, modify, and distribute.

---

## 🔗 Related Projects

- [commerce-atoms/agents](https://github.com/commerce-atoms/agents) - Agent role definitions and editor rules
- [hydrogen-storefront-starter](https://github.com/commerce-atoms/hydrogen-storefront-starter) - Reference Hydrogen implementation

---

<div align="center">

**[Documentation](./docs/)**

Made with ⚡ for AI agents that respect architecture

</div>

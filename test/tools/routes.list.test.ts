import { describe, it, expect } from "vitest";
import { parseRoutes } from "../../src/internal/routesParse.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesRoot = resolve(__dirname, "../fixtures/repo-explicit");

describe("codebase.routes.list", () => {
  it("should parse routes from routes.ts file", async () => {
    const result = await parseRoutes(fixturesRoot, "app/routes.ts");

    expect(result.confidence).toBe("high");
    expect(result.routes).toHaveLength(3);

    const productsRoute = result.routes.find(
      (r) => r.pattern === "/products/:handle"
    );
    expect(productsRoute).toBeDefined();
    expect(productsRoute?.file).toBe(
      "app/modules/products/product-handle.route.tsx"
    );
    expect(productsRoute?.kind).toBe("route");
    expect(productsRoute?.moduleGuess).toBe("products");

    const collectionsRoute = result.routes.find(
      (r) => r.pattern === "/collections/:handle"
    );
    expect(collectionsRoute).toBeDefined();
    expect(collectionsRoute?.file).toBe(
      "app/modules/collections/collections-index.route.tsx"
    );
    expect(collectionsRoute?.kind).toBe("route");
    expect(collectionsRoute?.moduleGuess).toBe("collections");

    const robotsRoute = result.routes.find((r) => r.pattern === "/robots.txt");
    expect(robotsRoute).toBeDefined();
    expect(robotsRoute?.file).toBe("app/platform/routing/robots.route.ts");
    expect(robotsRoute?.kind).toBe("resource");
    expect(robotsRoute?.moduleGuess).toBeUndefined();
  });

  it("should handle partial parse when AST finds fewer routes", async () => {
    // Create a temporary file with only 2 routes (less than expected 3)
    const { writeFile, unlink } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const tempFile = join(fixturesRoot, "app/routes-partial.ts");
    await writeFile(
      tempFile,
      `import { route } from "@react-router/node";
export const routes = [
  route("/products/:handle", "app/modules/products/product-handle.route.tsx"),
  route("/collections/:handle", "app/modules/collections/collections-index.route.tsx"),
];`
    );

    try {
      const result = await parseRoutes(fixturesRoot, "app/routes-partial.ts");
      expect(result.confidence).toBe("medium");
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some((w) => w.code === "PARTIAL_PARSE")).toBe(
        true
      );
      expect(result.routes.length).toBe(2);
    } finally {
      await unlink(tempFile).catch(() => {});
    }
  });

  it("should handle missing routes file gracefully", async () => {
    const result = await parseRoutes(fixturesRoot, "app/nonexistent.ts");

    expect(result.confidence).toBe("low");
    expect(result.routes).toHaveLength(0);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.some((w) => w.code === "FILE_READ_ERROR")).toBe(
      true
    );
  });
});

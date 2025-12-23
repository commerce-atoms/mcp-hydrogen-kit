import { describe, it, expect } from "vitest";
import {
  loadSchema,
  lookupType,
  lookupField,
  searchTypes,
} from "../../src/internal/schemaLoad.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { GraphQLObjectType } from "graphql";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = resolve(
  __dirname,
  "../fixtures/schema/storefront.schema.graphql"
);

describe("storefront.schema.lookup", () => {
  it("should load schema from GraphQL SDL file", async () => {
    const result = await loadSchema(schemaPath);

    expect(result.confidence).toBe("high");
    expect(result.schema).toBeDefined();
  });

  it("should load schema from introspection JSON file (wrapped format)", async () => {
    const introspectionPath = resolve(
      __dirname,
      "../fixtures/schema/storefront.introspection.json"
    );
    const result = await loadSchema(introspectionPath);

    expect(result.confidence).toBe("high");
    expect(result.schema).toBeDefined();

    // Verify it can lookup types
    const productType = lookupType(result.schema, "Product");
    expect(productType).toBeDefined();
  });

  it("should load schema from introspection JSON file (direct format)", async () => {
    const introspectionPath = resolve(
      __dirname,
      "../fixtures/schema/storefront.introspection-direct.json"
    );
    const result = await loadSchema(introspectionPath);

    expect(result.confidence).toBe("high");
    expect(result.schema).toBeDefined();

    // Verify it can lookup types
    const productType = lookupType(result.schema, "Product");
    expect(productType).toBeDefined();
  });

  it("should lookup type by name", async () => {
    const { schema } = await loadSchema(schemaPath);
    const productType = lookupType(schema, "Product");

    expect(productType).toBeDefined();
    expect(productType).toBeInstanceOf(GraphQLObjectType);
  });

  it("should lookup field on type", async () => {
    const { schema } = await loadSchema(schemaPath);
    const variantsField = lookupField(schema, "Product", "variants");

    expect(variantsField).toBeDefined();
    expect(variantsField?.name).toBe("variants");
    expect(variantsField?.args).toHaveLength(1);
    expect(variantsField?.args[0]?.name).toBe("first");
  });

  it("should search for types by substring", async () => {
    const { schema } = await loadSchema(schemaPath);
    const matches = searchTypes(schema, "Product");

    expect(matches).toContain("Product");
    expect(matches).toContain("ProductConnection");
    expect(matches).toContain("ProductVariant");
  });

  it("should handle missing schema file gracefully", async () => {
    const result = await loadSchema("nonexistent.graphql");

    expect(result.confidence).toBe("low");
    expect(result.warnings).toBeDefined();
  });
});

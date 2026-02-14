import { describe, it, expect, vi } from "vitest";

// Mock the DB and schema imports that db-loader pulls in at the top level,
// so Node never tries to open the real SQLite database.
vi.mock("@/lib/db", () => ({
  db: {},
}));
vi.mock("@/lib/db/schema", () => ({
  modules: {},
  exercises: {},
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

import { evaluateCheck } from "../db-loader";

// ---------------------------------------------------------------------------
// Tests for the Check DSL interpreter
// ---------------------------------------------------------------------------
describe("evaluateCheck — Check DSL", () => {
  // ── contains ──────────────────────────────────────────────────────────────
  describe("contains", () => {
    it("returns true when code contains the expected string", () => {
      expect(evaluateCheck({ contains: "provider" }, 'provider "aws" {}')).toBe(
        true
      );
    });

    it("returns false when code does not contain the expected string", () => {
      expect(evaluateCheck({ contains: "provider" }, 'resource "ec2" {}')).toBe(
        false
      );
    });
  });

  // ── not_contains ──────────────────────────────────────────────────────────
  describe("not_contains", () => {
    it("returns true when code does not contain the forbidden string", () => {
      expect(evaluateCheck({ not_contains: "TODO" }, "resource {}")).toBe(true);
    });

    it("returns false when code contains the forbidden string", () => {
      expect(evaluateCheck({ not_contains: "TODO" }, "// TODO: fix")).toBe(
        false
      );
    });
  });

  // ── match ─────────────────────────────────────────────────────────────────
  describe("match", () => {
    it("returns true when code matches the regex", () => {
      expect(
        evaluateCheck({ match: "resource\\s+\"\\w+\"" }, 'resource "ec2" {}')
      ).toBe(true);
    });

    it("returns false when code does not match the regex", () => {
      expect(evaluateCheck({ match: "^provider" }, "resource {}")).toBe(false);
    });
  });

  // ── not_match ─────────────────────────────────────────────────────────────
  describe("not_match", () => {
    it("returns true when code does not match the regex", () => {
      expect(evaluateCheck({ not_match: "TODO" }, "resource {}")).toBe(true);
    });

    it("returns false when code matches the forbidden regex", () => {
      expect(evaluateCheck({ not_match: "\\d{4}" }, "port: 8080")).toBe(false);
    });
  });

  // ── yaml_valid ────────────────────────────────────────────────────────────
  describe("yaml_valid", () => {
    it("returns true for valid YAML", () => {
      const yamlCode = "apiVersion: v1\nkind: Pod\n";
      expect(evaluateCheck({ yaml_valid: true }, yamlCode)).toBe(true);
    });

    it("returns false for invalid YAML", () => {
      // js-yaml is fairly lenient, so we use something that genuinely fails
      const badYaml = ":\n  :\n    : [";
      expect(evaluateCheck({ yaml_valid: true }, badYaml)).toBe(false);
    });
  });

  // ── yaml_has ──────────────────────────────────────────────────────────────
  describe("yaml_has", () => {
    it("returns true when the YAML document has the specified path", () => {
      const yamlCode =
        "apiVersion: v1\nkind: Pod\nmetadata:\n  name: test-pod\n";
      expect(evaluateCheck({ yaml_has: "metadata.name" }, yamlCode)).toBe(true);
    });

    it("returns false when the YAML document lacks the path", () => {
      const yamlCode = "apiVersion: v1\nkind: Pod\n";
      expect(evaluateCheck({ yaml_has: "metadata.name" }, yamlCode)).toBe(
        false
      );
    });

    it("returns false when YAML is invalid", () => {
      expect(evaluateCheck({ yaml_has: "foo" }, ":\n  : [")).toBe(false);
    });
  });

  // ── yaml_not_has ──────────────────────────────────────────────────────────
  describe("yaml_not_has", () => {
    it("returns true when the YAML path does not exist", () => {
      const yamlCode = "apiVersion: v1\nkind: Service\n";
      expect(
        evaluateCheck({ yaml_not_has: "spec.replicas" }, yamlCode)
      ).toBe(true);
    });

    it("returns false when the YAML path exists", () => {
      const yamlCode = "apiVersion: v1\nspec:\n  replicas: 3\n";
      expect(
        evaluateCheck({ yaml_not_has: "spec.replicas" }, yamlCode)
      ).toBe(false);
    });
  });

  // ── yaml_is_array ─────────────────────────────────────────────────────────
  describe("yaml_is_array", () => {
    it("returns true when the YAML path points to an array", () => {
      const yamlCode = "items:\n  - a\n  - b\n";
      expect(evaluateCheck({ yaml_is_array: "items" }, yamlCode)).toBe(true);
    });

    it("returns false when the YAML path is not an array", () => {
      const yamlCode = "items: not-an-array\n";
      expect(evaluateCheck({ yaml_is_array: "items" }, yamlCode)).toBe(false);
    });
  });

  // ── yaml_equals ───────────────────────────────────────────────────────────
  describe("yaml_equals", () => {
    it("returns true when the YAML path equals the expected value", () => {
      const yamlCode = "spec:\n  replicas: 3\n";
      expect(
        evaluateCheck(
          { yaml_equals: { path: "spec.replicas", value: 3 } },
          yamlCode
        )
      ).toBe(true);
    });

    it("returns false when the value does not match", () => {
      const yamlCode = "spec:\n  replicas: 5\n";
      expect(
        evaluateCheck(
          { yaml_equals: { path: "spec.replicas", value: 3 } },
          yamlCode
        )
      ).toBe(false);
    });
  });

  // ── yaml_items_have ───────────────────────────────────────────────────────
  describe("yaml_items_have", () => {
    it("returns true when all items in the array have the required fields", () => {
      const yamlCode =
        "containers:\n  - name: app\n    image: nginx\n  - name: sidecar\n    image: envoy\n";
      expect(
        evaluateCheck(
          {
            yaml_items_have: {
              path: "containers",
              fields: ["name", "image"],
            },
          },
          yamlCode
        )
      ).toBe(true);
    });

    it("returns false when an item is missing a required field", () => {
      const yamlCode =
        "containers:\n  - name: app\n    image: nginx\n  - name: sidecar\n";
      expect(
        evaluateCheck(
          {
            yaml_items_have: {
              path: "containers",
              fields: ["name", "image"],
            },
          },
          yamlCode
        )
      ).toBe(false);
    });
  });

  // ── Combinators: all / any / not ──────────────────────────────────────────
  describe("all combinator", () => {
    it("returns true when all sub-checks pass", () => {
      expect(
        evaluateCheck(
          {
            all: [{ contains: "foo" }, { contains: "bar" }],
          },
          "foo bar"
        )
      ).toBe(true);
    });

    it("returns false when any sub-check fails", () => {
      expect(
        evaluateCheck(
          {
            all: [{ contains: "foo" }, { contains: "baz" }],
          },
          "foo bar"
        )
      ).toBe(false);
    });
  });

  describe("any combinator", () => {
    it("returns true when at least one sub-check passes", () => {
      expect(
        evaluateCheck(
          {
            any: [{ contains: "foo" }, { contains: "baz" }],
          },
          "foo bar"
        )
      ).toBe(true);
    });

    it("returns false when no sub-check passes", () => {
      expect(
        evaluateCheck(
          {
            any: [{ contains: "baz" }, { contains: "qux" }],
          },
          "foo bar"
        )
      ).toBe(false);
    });
  });

  describe("not combinator", () => {
    it("returns true when the inner check fails", () => {
      expect(
        evaluateCheck({ not: { contains: "secret" } }, "public data")
      ).toBe(true);
    });

    it("returns false when the inner check passes", () => {
      expect(
        evaluateCheck({ not: { contains: "secret" } }, "my secret value")
      ).toBe(false);
    });
  });

  // ── Multiple conditions in one Check object (AND semantics) ───────────────
  describe("multiple conditions (AND)", () => {
    it("returns true when all conditions in a single check pass", () => {
      const yamlCode = "apiVersion: v1\nkind: Pod\n";
      expect(
        evaluateCheck(
          { contains: "apiVersion", yaml_valid: true, yaml_has: "kind" },
          yamlCode
        )
      ).toBe(true);
    });

    it("returns false if any one condition fails", () => {
      const yamlCode = "apiVersion: v1\nkind: Pod\n";
      expect(
        evaluateCheck(
          {
            contains: "apiVersion",
            yaml_valid: true,
            yaml_has: "metadata.name",
          },
          yamlCode
        )
      ).toBe(false);
    });
  });

  // ── Empty check object ────────────────────────────────────────────────────
  describe("empty check", () => {
    it("returns true for an empty check object (no conditions)", () => {
      expect(evaluateCheck({}, "anything")).toBe(true);
    });
  });
});

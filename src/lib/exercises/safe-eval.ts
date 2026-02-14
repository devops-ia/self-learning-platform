/**
 * Safe evaluation context for custom check DSL code
 *
 * SECURITY NOTE: This provides a safer alternative to new Function() but is NOT
 * a complete sandbox. Custom code should ONLY be created by trusted admins.
 *
 * Allowed operations:
 * - Access to code, yaml, and _get helper
 * - String operations, regex, JSON
 * - No access to: require, import, process, global, etc.
 */

import * as yaml from "js-yaml";
import { _get } from "./helpers";

interface SafeContext {
  code: string;
  yaml: typeof yaml;
  _get: typeof _get;
  // Additional safe utilities
  String: typeof String;
  Number: typeof Number;
  Boolean: typeof Boolean;
  Array: typeof Array;
  Object: typeof Object;
  JSON: typeof JSON;
  RegExp: typeof RegExp;
  Math: typeof Math;
}

/**
 * Execute custom validation code in a restricted context
 *
 * WARNING: This is NOT a complete security sandbox. Only use with
 * admin-created content. Never allow user-generated custom code.
 */
export function safeEval(
  customCode: string,
  code: string,
  context: Partial<SafeContext> = {}
): unknown {
  // Create restricted context with only safe globals
  const safeContext: SafeContext = {
    code,
    yaml,
    _get,
    String,
    Number,
    Boolean,
    Array,
    Object,
    JSON,
    RegExp,
    Math,
    ...context,
  };

  // Validate code doesn't contain dangerous patterns
  const dangerousPatterns = [
    /\brequire\s*\(/,
    /\bimport\s+/,
    /\bprocess\b/,
    /\bglobal\b/,
    /\b__dirname\b/,
    /\b__filename\b/,
    /\beval\s*\(/,
    /\bFunction\s*\(/,
    /\bsetTimeout\b/,
    /\bsetInterval\b/,
    /\bfetch\b/,
    /\bXMLHttpRequest\b/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(customCode)) {
      throw new Error(
        `Potentially dangerous code detected: ${pattern.source}`
      );
    }
  }

  try {
    // Create function with restricted scope
    // Use parameter names to shadow dangerous globals
    const fn = new Function(
      "code",
      "yaml",
      "_get",
      "String",
      "Number",
      "Boolean",
      "Array",
      "Object",
      "JSON",
      "RegExp",
      "Math",
      // Shadow dangerous globals with undefined
      "require",
      "import",
      "process",
      "global",
      "eval",
      "Function",
      "setTimeout",
      "setInterval",
      "fetch",
      `"use strict";\n${customCode}`
    );

    // Execute with safe context and undefined for dangerous params
    return fn(
      safeContext.code,
      safeContext.yaml,
      safeContext._get,
      safeContext.String,
      safeContext.Number,
      safeContext.Boolean,
      safeContext.Array,
      safeContext.Object,
      safeContext.JSON,
      safeContext.RegExp,
      safeContext.Math,
      undefined, // require
      undefined, // import
      undefined, // process
      undefined, // global
      undefined, // eval
      undefined, // Function
      undefined, // setTimeout
      undefined  // setInterval
    );
  } catch (error) {
    throw new Error(
      `Custom code execution failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

/**
 * Validate custom code syntax without executing it
 */
export function validateCustomCode(customCode: string): {
  valid: boolean;
  error?: string;
} {
  try {
    // Try to create the function to check syntax
    new Function(customCode);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Syntax error",
    };
  }
}

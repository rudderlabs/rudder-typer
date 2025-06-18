import { BaseNamer } from '../../namer/index.js';
import camelCase from 'lodash/camelCase.js';
import upperFirst from 'lodash/upperFirst.js';

/**
 * TypeScript-specific name generator that implements BaseNamer.
 * Handles TypeScript language rules, naming conventions, and edge cases.
 */
export class TypeScriptNamer extends BaseNamer {
  protected reservedKeywords: Set<string> = new Set([
    'abstract',
    'any',
    'as',
    'async',
    'await',
    'boolean',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'constructor',
    'continue',
    'debugger',
    'declare',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'from',
    'function',
    'get',
    'if',
    'implements',
    'import',
    'in',
    'infer',
    'instanceof',
    'interface',
    'is',
    'keyof',
    'let',
    'module',
    'namespace',
    'never',
    'new',
    'null',
    'number',
    'object',
    'package',
    'private',
    'protected',
    'public',
    'readonly',
    'require',
    'return',
    'set',
    'static',
    'string',
    'super',
    'switch',
    'symbol',
    'this',
    'throw',
    'true',
    'try',
    'type',
    'typeof',
    'undefined',
    'unique',
    'unknown',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ]);

  /**
   * Sanitizes a string to be a valid TypeScript identifier.
   * - Replaces invalid characters with underscores
   * - Handles numeric prefixes by adding underscore
   *
   * @param name The string to sanitize
   * @returns A valid TypeScript identifier
   */
  public sanitize(name: string): string {
    // Replace any non-alphanumeric characters with underscores
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    // If it starts with a number, prepend an underscore
    if (/^[0-9]/.test(sanitized)) {
      return `_${sanitized}`;
    }
    return sanitized;
  }

  /**
   * Creates a PascalCase type name from parts.
   * Joins parts with spaces, converts to camelCase, and capitalizes first letter.
   *
   * @param parts Array of strings that make up the type name
   * @returns A unique, valid TypeScript type identifier
   */
  public createTypeName(parts: string[]): string {
    const baseName = upperFirst(camelCase(parts.join(' ')));
    return this.createName(baseName, 'types');
  }

  /**
   * Creates a camelCase function name from parts.
   *
   * @param parts Array of strings that make up the function name
   * @returns A unique, valid TypeScript function identifier
   */
  public createFunctionName(parts: string[]): string {
    const baseName = camelCase(parts.join(' '));
    return this.createName(baseName, 'functions');
  }

  /**
   * Creates a camelCase property name that's unique within its containing type.
   *
   * @param name The base property name
   * @param typeName The name of the containing type (used for scope)
   * @returns A unique, valid TypeScript property identifier
   */
  public createPropertyName(name: string, typeName: string): string {
    const baseName = camelCase(name);
    return this.createName(baseName, `properties/${typeName}`);
  }

  /**
   * Creates a PascalCase enum name from parts.
   * Joins parts with spaces, converts to camelCase, and capitalizes first letter.
   *
   * @param parts Array of strings that make up the enum name
   * @returns A unique, valid TypeScript enum identifier
   */
  public createEnumName(parts: string[]): string {
    const baseName = upperFirst(camelCase(parts.join(' ')));
    return this.createName(baseName, 'enums');
  }

  /**
   * Creates a PascalCase enum member name.
   * Since enum members are scoped to their enum, we use the enum name for uniqueness.
   *
   * @param name The base member name
   * @param enumName The name of the containing enum (used for scope)
   * @returns A unique, valid TypeScript enum member identifier
   */
  public createEnumMemberName(name: string, enumName: string): string {
    const baseName = upperFirst(camelCase(name));
    return this.createName(baseName, `enums/${enumName}`);
  }
}

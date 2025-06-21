import { BaseNamer } from '../../namer/index.js';
import camelCase from 'lodash/camelCase.js';
import upperFirst from 'lodash/upperFirst.js';

/**
 * Kotlin-specific name generator that implements BaseNamer.
 * Handles Kotlin language rules, naming conventions, and edge cases.
 */
export class KotlinNamer extends BaseNamer {
  protected reservedKeywords: Set<string> = new Set([
    'abstract',
    'actual',
    'annotation',
    'as',
    'break',
    'by',
    'catch',
    'class',
    'companion',
    'constructor',
    'continue',
    'crossinline',
    'data',
    'delegate',
    'do',
    'dynamic',
    'else',
    'enum',
    'expect',
    'external',
    'false',
    'field',
    'final',
    'finally',
    'for',
    'fun',
    'get',
    'if',
    'import',
    'in',
    'infix',
    'init',
    'inner',
    'interface',
    'internal',
    'is',
    'lateinit',
    'noinline',
    'null',
    'object',
    'open',
    'operator',
    'out',
    'override',
    'package',
    'private',
    'property',
    'protected',
    'public',
    'reified',
    'return',
    'sealed',
    'set',
    'super',
    'suspend',
    'tailrec',
    'this',
    'throw',
    'true',
    'try',
    'typealias',
    'val',
    'var',
    'vararg',
    'when',
    'where',
    'while',
  ]);

  /**
   * Sanitizes a string to be a valid Kotlin identifier.
   * - Replaces invalid characters with underscores
   * - Handles numeric prefixes by adding underscore
   * - Handles backtick escaping for identifiers that match reserved keywords
   *
   * @param name The string to sanitize
   * @returns A valid Kotlin identifier
   */
  public sanitize(name: string): string {
    // Replace any non-alphanumeric characters with underscores
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    // If it starts with a number, prepend an underscore
    if (/^[0-9]/.test(sanitized)) {
      return `_${sanitized}`;
    }
    // If it's a reserved keyword, wrap in backticks
    if (this.reservedKeywords.has(sanitized)) {
      return `\`${sanitized}\``;
    }
    return sanitized;
  }

  /**
   * Creates a PascalCase class name from parts.
   * Joins parts with spaces, converts to camelCase, and capitalizes first letter.
   * Used for both regular classes and data classes.
   *
   * @param parts Array of strings that make up the class name
   * @param id Unique identifier for the class
   * @returns A unique, valid Kotlin class identifier
   */
  public createClassName(id: string, parts: string[]): string {
    const baseName = upperFirst(camelCase(parts.join(' ')));
    return this.registerName(id, baseName, 'classes');
  }

  /**
   * Creates a camelCase function name from parts.
   *
   * @param parts Array of strings that make up the function name
   * @param id Unique identifier for the function
   * @returns A unique, valid Kotlin function identifier
   */
  public createFunctionName(id: string, parts: string[]): string {
    const baseName = camelCase(parts.join(' '));
    return this.registerName(id, baseName, 'functions');
  }

  /**
   * Creates a camelCase property name that's unique within its containing class.
   *
   * @param name The base property name
   * @param className The name of the containing class (used for scope)
   * @param id Unique identifier for the property
   * @returns A unique, valid Kotlin property identifier
   */
  public createPropertyName(id: string, name: string, className: string): string {
    const baseName = camelCase(name);
    return this.registerName(id, baseName, `properties/${className}`);
  }

  /**
   * Creates a PascalCase enum name from parts.
   * Joins parts with spaces, converts to camelCase, and capitalizes first letter.
   *
   * @param parts Array of strings that make up the enum name
   * @param id Unique identifier for the enum
   * @returns A unique, valid Kotlin enum identifier
   */
  public createEnumName(id: string, parts: string[]): string {
    const baseName = upperFirst(camelCase(parts.join(' ')));
    return this.registerName(id, baseName, 'enums');
  }

  /**
   * Creates a SCREAMING_SNAKE_CASE enum member name, as per Kotlin conventions.
   * Since enum members are scoped to their enum, we use the enum name for uniqueness.
   *
   * @param name The base member name
   * @param enumName The name of the containing enum (used for scope)
   * @param id Unique identifier for the enum member
   * @returns A unique, valid Kotlin enum member identifier
   */
  public createEnumMemberName(id: string, name: string, enumName: string): string {
    // Convert to SCREAMING_SNAKE_CASE
    const baseName = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    return this.registerName(id, baseName, `enums/${enumName}`);
  }
}

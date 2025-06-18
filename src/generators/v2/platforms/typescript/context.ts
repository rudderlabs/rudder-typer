/**
 * Top-level context for TypeScript code generation.
 * Contains:
 *  - type definitions
 *  - function definitions of the RudderTyperAnalytics class.
 */
export type TypeScriptContext = {
  types: TypeContext[];
  functions: FunctionContext[];
};

/**
 * Represents a TypeScript type definition, including its name, properties, and optional comment.
 */
export type TypeContext = {
  name: string;
  comment?: string;
  properties: PropertyContext[];
};

/**
 * Represents a property within a TypeScript type definition.
 */
export type PropertyContext = {
  name: string;
  type: string;
  comment?: string;
  optional?: boolean;
};

/**
 * Represents an analytics tracking function definition, including its name,
 * event type, and the type of properties it accepts.
 */
export type FunctionContext = {
  name: string;
  eventType: string;
  eventName?: string;
  propertyType: string;
  comment?: string;
};

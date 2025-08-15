/**
 * Top-level context for Kotlin code generation.
 * Contains:
 *  - class definitions
 *  - enum definitions
 *  - function definitions for the RudderTyperAnalytics class.
 */
export type KotlinContext = {
  classes: ClassContext[];
  functions: FunctionContext[];
  enums: EnumContext[];
};

/**
 * Represents a Kotlin data class definition.
 */
export type ClassContext = {
  name: string;
  comment?: string;
  properties: PropertyContext[];
};

/**
 * Represents a Kotlin enum class definition.
 */
export type EnumContext = {
  name: string;
  comment?: string;
  members: EnumMemberContext[];
};

/**
 * Represents a member of a Kotlin enum class.
 */
export type EnumMemberContext = {
  name: string;
  comment?: string;
  value: string;
};

/**
 * Represents a property within a Kotlin data class definition.
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

export type EventType = 'track' | 'identify' | 'page' | 'screen' | 'group';

export type EventRuleSection = 'properties' | 'traits';

export type Plan = {
  name: string;
  rules: EventRule[];
};

export type CustomType = {
  name: string;
  description: string;
  schema: ObjectSchema;
  enum?: string[];
};

export type Event = {
  eventType: EventType;
  name?: string;
  description?: string;
};

export type PrimitiveType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
export type PropertyType = PrimitiveType | CustomType;
export type PropertyConfig = {
  enum?: string[]; // For enum types
};

export type Property = {
  name: string;
  description: string;
  type: PropertyType; // e.g., 'string', 'number', 'boolean', etc.
  config?: PropertyConfig; // Additional configuration for the property
};

export type EventRule = {
  event: Event;
  section: EventRuleSection;
  schema: ObjectSchema;
};

export type ObjectSchema = {
  properties: Record<string, PropertySchema>;
  additionalProperties?: boolean;
};

export type PropertySchema = {
  property: Property;
  required: boolean;
  schema?: ObjectSchema;
};

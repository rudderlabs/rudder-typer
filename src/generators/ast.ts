import { JSONSchema7 } from 'json-schema';

// Schema represents a JSON Schema, however the representation
// differs in ways that make it easier for codegen.
// It does not seek to represent all of JSON Schema, only the subset that
// is meaningful for codegen. Full JSON Schema validation should be done
// at run-time and should be supported by all RudderTyper clients.
export type Schema = PrimitiveTypeSchema | ArrayTypeSchema | ObjectTypeSchema | UnionTypeSchema;

export type PrimitiveTypeSchema = SchemaMetadata & PrimitiveTypeFields;
export type ArrayTypeSchema = SchemaMetadata & ArrayTypeFields;
export type ObjectTypeSchema = SchemaMetadata & ObjectTypeFields;
export type UnionTypeSchema = SchemaMetadata & UnionTypeFields;

export type SchemaMetadata = {
  name: string;
  // The language-appropriate identifier name for this property or type
  // Used across different generators for class names, interface names, etc.
  identifierName?: string;
  description?: string;
  isRequired?: boolean;
  isNullable?: boolean;
};

export type TypeSpecificFields =
  | PrimitiveTypeFields
  | ArrayTypeFields
  | ObjectTypeFields
  | UnionTypeFields;

export interface RefInfo {
  _refName?: string;
}

// TODO: consider whether non-primitive types should have an enum.
// For unions, potentially the enum should just be within the primitive type
// and filtered down to the relevant enum values.
export type Enumable = {
  // enum optionally represents a specific set of allowed values.
  // Note: const fields (from JSON Schema) are treated as 1-element enums.
  enum?: EnumValue[];
};

// Note: we don't support objects or arrays as enums, for simplification purposes.
export type EnumValue = string | number | boolean | null;

export type PrimitiveTypeFields = Enumable &
  RefInfo & {
    type: Type.STRING | Type.INTEGER | Type.NUMBER | Type.BOOLEAN | Type.ANY;
  };

export type ArrayTypeFields = RefInfo & {
  type: Type.ARRAY;
  // items specifies the type of any items in this array.
  items: TypeSpecificFields;
};

export type ObjectTypeFields = RefInfo & {
  type: Type.OBJECT;
  defs?: Record<string, Schema>;
  // properties specifies all of the expected properties in this object.
  // Note: if an empty properties list is passed, all properties should be allowed.
  properties: Schema[];
};

export type UnionTypeFields = Enumable &
  RefInfo & {
    type: Type.UNION;
    types: TypeSpecificFields[];
  };

// Type is a standardization of the various JSON Schema types. It removes the concept
// of a "null" type, and introduces Unions and an explicit Any type. The Any type is
// part of the JSON Schema spec, but it isn't an explicit type.
export enum Type {
  ANY,
  STRING,
  BOOLEAN,
  INTEGER,
  NUMBER,
  OBJECT,
  ARRAY,
  UNION,
}

function toType(t: string | undefined): Type {
  switch (t) {
    case 'string':
      return Type.STRING;
    case 'integer':
      return Type.INTEGER;
    case 'number':
      return Type.NUMBER;
    case 'boolean':
      return Type.BOOLEAN;
    case 'object':
      return Type.OBJECT;
    case 'array':
      return Type.ARRAY;
    case 'null':
      return Type.ANY;
    default:
      throw new Error(`Unsupported type: ${t}`);
  }
}

// getPropertiesSchema extracts the Schema for `.properties` from an
// event schema.
export function getPropertiesSchema(event: Schema): ObjectTypeSchema {
  let properties: ObjectTypeSchema | undefined = undefined;

  // Events should always be a type="object" at the root, anything
  // else would not match on a RudderStack analytics event.
  let defs: Record<string, Schema> | undefined = undefined;

  if (event.type === Type.OBJECT) {
    const propertiesSchema = event.properties.find(
      (schema: Schema): boolean => schema.name === 'properties',
    );
    // Pickup the defs from the event schema if type Object
    defs = event.defs;
    // The schema representing `.properties` in the RudderStack analytics
    // event should also always be an object.
    if (propertiesSchema && propertiesSchema.type === Type.OBJECT) {
      const isRequired = (propertiesSchema as ObjectTypeSchema).properties.find(
        (schema: Schema): boolean => schema.isRequired === true,
      );
      properties = { ...propertiesSchema, isRequired: !!isRequired };
    }
  }

  return {
    // If `.properties` doesn't exist in the user-supplied JSON Schema,
    // default to an empty object schema as a sane default.
    type: Type.OBJECT,
    properties: [],
    ...(properties || {}),
    isRequired: properties ? !!properties.isRequired : false,
    isNullable: false,
    defs: defs,
    // Use the event's name and description when generating an interface
    // to represent these properties.
    name: event.name,
    description: event.description,
  };
}

// get traits from the event schema
export function getTraitsSchema(event: Schema): ObjectTypeSchema {
  let traits: ObjectTypeSchema | undefined = undefined;

  if (event.type === Type.OBJECT) {
    const traitsSchema = event.properties.find(
      (schema: Schema): boolean => schema.name === 'traits',
    );

    if (traitsSchema && traitsSchema.type === Type.OBJECT) {
      traits = traitsSchema;
    } else {
      // If not found at top level, look for traits in context
      const contextSchema = event.properties.find(
        (schema: Schema): boolean => schema.name === 'context',
      );

      if (contextSchema && contextSchema.type === Type.OBJECT) {
        const contextTraitsSchema = contextSchema.properties.find(
          (schema: Schema): boolean => schema.name === 'traits',
        );

        if (contextTraitsSchema && contextTraitsSchema.type === Type.OBJECT) {
          traits = contextTraitsSchema;
        }
      }
    }
  }

  return {
    type: Type.OBJECT,
    properties: [],
    ...(traits || {}),
    isRequired: traits ? !!traits.isRequired : false,
    isNullable: false,
    name: event.name,
    description: event.description,
  };
}

function copyAdvancedKeywords(from: JSONSchema7, to: Schema): void {
  // List of known advanced keywords we want to preserve
  const advancedKeywords = [
    'format',
    'pattern',
    'maxLength',
    'minLength',
    'maximum',
    'minimum',
    'exclusiveMaximum',
    'exclusiveMinimum',
    'multipleOf',
    'maxItems',
    'minItems',
    'uniqueItems',
  ];

  // Copy each keyword that exists in the source schema
  for (const keyword of advancedKeywords) {
    if (from[keyword as keyof JSONSchema7] !== undefined) {
      (to as any)[keyword] = from[keyword as keyof JSONSchema7];
    }
  }
}

// parse transforms a JSON Schema into a standardized Schema.
export function parse(raw: JSONSchema7, name?: string, isRequired?: boolean): Schema {
  // Parse the relevant fields from the JSON Schema based on the type.
  const typeSpecificFields = parseTypeSpecificFields(raw, getType(raw));

  const schema: Schema = {
    name: name || raw.title || '',
    ...typeSpecificFields,
  };

  if (raw.$ref) {
    schema._refName = extractRefName(raw.$ref) || '';
  }

  if (raw.description) {
    schema.description = raw.description;
  }

  if (isRequired) {
    schema.isRequired = true;
  }

  if (isNullable(raw)) {
    schema.isNullable = true;
  }

  copyAdvancedKeywords(raw, schema);

  return schema;
}

// parseTypeSpecificFields extracts the relevant fields from the raw JSON Schema,
// interpreting the schema based on the provided Type.
function parseTypeSpecificFields(raw: JSONSchema7, type: Type): TypeSpecificFields {
  if (type === Type.OBJECT) {
    const fields: ObjectTypeFields = { type, properties: [] };
    const requiredFields = new Set(raw.required || []);
    for (const entry of Object.entries(raw.properties || {})) {
      const [property, propertySchema] = entry;
      if (typeof propertySchema !== 'boolean') {
        const isRequired = requiredFields.has(property);
        fields.properties.push(parse(propertySchema, property, isRequired));
      }
    }

    if (raw.$defs) {
      fields.defs = {};
      for (const [name, schema] of Object.entries(raw.$defs)) {
        if (typeof schema === 'boolean') {
          continue;
        }
        fields.defs[name] = parse(schema, name);
      }
    }

    return fields;
  } else if (type === Type.ARRAY) {
    const fields: ArrayTypeFields = { type, items: { type: Type.ANY } };
    if (typeof raw.items !== 'boolean' && raw.items !== undefined) {
      if ('$ref' in raw.items && typeof raw.items.$ref === 'string') {
        const _refName = extractRefName(raw.items.$ref) || '';
        fields.items = {
          ...parse(raw.items, undefined, false),
        };
        fields._refName = _refName;
      } else {
        const definitions = raw.items instanceof Array ? raw.items : [raw.items];
        const schemas = definitions.filter((def) => typeof def !== 'boolean') as JSONSchema7[];
        if (schemas.length === 1) {
          const schema = schemas[0];
          if (
            schema.properties &&
            Object.keys(schema.properties).length > 0 &&
            schema.type === undefined
          ) {
            schema.type = ['array', 'object'];
          }
          fields.items = parseTypeSpecificFields(schema, getType(schema));
        } else if (schemas.length > 1) {
          fields.items = {
            type: Type.UNION,
            types: schemas.map((schema) => parseTypeSpecificFields(schema, getType(schema))),
          };
        }
      }
    }
    return fields;
  } else if (type === Type.UNION) {
    const fields: UnionTypeFields = { type, types: [] };
    for (const val of getRawTypes(raw).values()) {
      // For codegen purposes, we don't consider "null" as a type, so remove it.
      if (val === 'null') {
        continue;
      }

      fields.types.push(parseTypeSpecificFields(raw, toType(val)));
    }

    if (raw.enum) {
      fields.enum = getEnum(raw);
    }

    return fields;
  } else {
    const fields: PrimitiveTypeFields = { type };

    // TODO: Per above comment, consider filtering the enum values to just the matching type (string, boolean, etc.).
    if (raw.enum) {
      fields.enum = getEnum(raw);
    }

    // Handle the special case of `type: "null"`. In this case, only the value "null"
    // is allowed, so treat this as a single-value enum.
    const rawTypes = getRawTypes(raw);
    if (rawTypes.has('null') && rawTypes.size === 1) {
      fields.enum = [null];
    }

    return fields;
  }
}

// getRawTypes returns the types for a given raw JSON Schema. These correspond
// with the standard JSON Schema types (null, string, etc.)
function getRawTypes(raw: JSONSchema7): Set<string> {
  // JSON Schema's `type` field is either an array or a string -- standardize it into an array.
  const rawTypes = new Set<string>();
  if (typeof raw.type === 'string') {
    rawTypes.add(raw.type);
  } else if (raw.type instanceof Array) {
    raw.type.forEach((t) => rawTypes.add(t));
  }

  return rawTypes;
}

// getType parses the raw types from a JSON Schema and returns the standardized Type.
function getType(raw: JSONSchema7): Type {
  const rawTypes = getRawTypes(raw);
  // For codegen purposes, we don't consider "null" as a type, so remove it.
  rawTypes.delete('null');

  let type = Type.ANY;
  if (rawTypes.size === 1) {
    type = toType(rawTypes.values().next().value);
  } else if (rawTypes.size >= 1) {
    type = Type.UNION;
  }

  return type;
}

// isNullable returns true if `null` is a valid value for this JSON Schema.
function isNullable(raw: JSONSchema7): boolean {
  const typeAllowsNull = getRawTypes(raw).has('null') || getType(raw) === Type.ANY;
  const enumAllowsNull = !raw.enum || raw.enum.includes(null) || raw.enum.includes('null');

  return typeAllowsNull && enumAllowsNull;
}

// getEnum parses the enum, if specified
function getEnum(raw: JSONSchema7): EnumValue[] | undefined {
  if (!raw.enum) {
    return undefined;
  }

  const enm = raw.enum.filter(
    (val) => ['boolean', 'number', 'string', 'integer'].includes(typeof val) || val === null,
  ) as EnumValue[];

  return enm;
}

export function extractRefName(ref: string): string | null {
  const defsPattern = /^#\/\$defs\/(.+)$/;
  const match = ref.match(defsPattern);
  return match ? match[1] : null;
}

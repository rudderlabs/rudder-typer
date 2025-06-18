import { ObjectSchema, Plan } from '../../plan/index.js';
import { Platform } from '../core/index.js';
import Handlebars from 'handlebars';
import { FunctionContext, PropertyContext, TypeContext, TypeScriptContext } from './context.js';
import { readFile } from 'fs/promises';
import { TypeScriptNamer } from './namer.js';

/**
 * TypeScript Platform implementation that generates type-safe analytics bindings.
 * Transforms a tracking Plan into TypeScript types and functions.
 */
const platform: Platform = {
  render: async (plan: Plan): Promise<Record<string, string>> => {
    const path = new URL('./templates/index.hbs', import.meta.url);
    const template = await readFile(path, {
      encoding: 'utf-8',
    });

    const compiled = Handlebars.compile(template, {
      noEscape: true,
    });

    const content = compiled(contextFromPlan(plan));

    return {
      'index.ts': content,
    };
  },
};

/**
 * Transforms a Plan into a TypeScriptContext containing type and function definitions.
 * - Generates a type for each event in the plan
 * - Creates nested types for object properties
 * - Ensures all generated names are valid TypeScript identifiers
 *
 * @param plan The analytics tracking plan to process
 * @returns Context object for template rendering
 */
function contextFromPlan(plan: Plan): TypeScriptContext {
  const types: TypeContext[] = [];
  const functions: FunctionContext[] = [];
  const namer = new TypeScriptNamer();

  for (const rule of plan.rules) {
    const { event, schema } = rule;
    const eventName = event.name ?? '';
    const typeNameParts = [eventName, event.eventType, 'Event', 'Properties'];
    const propertyType = namer.createTypeName(typeNameParts);

    // Start processing from the top-level schema of the event rule.
    processSchema(schema, propertyType, [], types, namer, typeNameParts.slice(0, -1));

    // Generate function context
    functions.push({
      name: namer.createFunctionName([event.eventType, eventName]),
      eventType: event.eventType,
      eventName: event.name,
      propertyType,
      comment: event.description,
    });
  }

  return {
    types,
    functions,
  };
}

/**
 * Recursively processes an object schema to generate TypeScript type definitions.
 * Handles nested objects by creating separate types with appropriate naming.
 *
 * @param schema The object schema to process
 * @param typeName Name for the type being generated
 * @param path Current path in the object hierarchy
 * @param allTypes Array to collect all generated types
 * @param namer Name generator for creating valid identifiers
 * @param baseNameParts Base parts of the type name (e.g., event name and type)
 * @returns Array of property contexts for the current type
 */
function processSchema(
  schema: ObjectSchema,
  typeName: string,
  path: string[],
  allTypes: TypeContext[],
  namer: TypeScriptNamer,
  baseNameParts: string[],
): PropertyContext[] {
  const properties: PropertyContext[] = [];

  for (const key in schema.properties) {
    const propertySchema = schema.properties[key];
    const { property, required, schema: nestedSchema } = propertySchema;
    const newPath = [...path, property.name];

    if (property.type === 'object' && nestedSchema) {
      // It's a nested object. Generate a new type for it.
      const nestedTypeName = namer.createTypeName([
        ...baseNameParts,
        ...path,
        property.name,
        'Properties',
      ]);
      processSchema(nestedSchema, nestedTypeName, newPath, allTypes, namer, baseNameParts);
      properties.push({
        name: namer.createPropertyName(property.name, typeName),
        type: nestedTypeName,
        comment: property.description,
        optional: !required,
      });
    } else {
      // It's a primitive type.
      properties.push({
        name: namer.createPropertyName(property.name, typeName),
        type: property.type,
        comment: property.description,
        optional: !required,
      });
    }
  }

  // Create a new type for the current schema level.
  allTypes.push({
    name: typeName,
    properties,
  });

  return properties;
}

export default platform;

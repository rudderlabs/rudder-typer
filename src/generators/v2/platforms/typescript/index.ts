import { ObjectSchema, Plan } from '../../plan/index.js';
import { Platform } from '../core/index.js';
import Handlebars from 'handlebars';
import { EnumMemberContext, PropertyContext, TypeScriptContext } from './context.js';
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
  const context: TypeScriptContext = {
    types: [],
    functions: [],
    enums: [],
  };
  const namer = new TypeScriptNamer();

  for (const rule of plan.rules) {
    const { event, schema } = rule;
    const eventName = event.name ?? '';
    const typeNameParts = [eventName, event.eventType, 'Event', 'Properties'];
    const typeId = `${event.eventType}.${eventName}.type`;
    const propertyType = namer.createTypeName(typeId, typeNameParts);

    // Start processing from the top-level schema of the event rule.
    processSchema(schema, propertyType, [], context, namer, typeNameParts.slice(0, -1));

    // Generate function context
    const functionId = `${event.eventType}.${eventName}.function`;
    context.functions.push({
      name: namer.createFunctionName(functionId, [event.eventType, eventName]),
      eventType: event.eventType,
      eventName: event.name,
      propertyType,
      comment: event.description,
    });
  }

  return context;
}

/**
 * Recursively processes an object schema to generate TypeScript type definitions.
 * Handles nested objects by creating separate types with appropriate naming.
 *
 * @param schema The object schema to process
 * @param typeName Name for the type being generated
 * @param path Current path in the object hierarchy
 * @param context The TypeScript context to enrich with types and enums
 * @param namer Name generator for creating valid identifiers
 * @param baseNameParts Base parts of the type name (e.g., event name and type)
 * @returns Array of property contexts for the current type
 */
function processSchema(
  schema: ObjectSchema,
  typeName: string,
  path: string[],
  context: TypeScriptContext,
  namer: TypeScriptNamer,
  baseNameParts: string[],
): PropertyContext[] {
  const properties: PropertyContext[] = [];

  for (const key in schema.properties) {
    const propertySchema = schema.properties[key];
    const { property, required, schema: nestedSchema } = propertySchema;
    const newPath = [...path, property.name];

    const propId = `${[...baseNameParts, ...path, property.name].join('.')}.prop`;

    if (property.type === 'object' && nestedSchema) {
      // It's a nested object. Generate a new type for it.
      const typeId = `${[...baseNameParts, ...path, property.name].join('.')}.type`;
      const nestedTypeName = namer.createTypeName(typeId, [
        ...baseNameParts,
        ...path,
        property.name,
        'Properties',
      ]);
      processSchema(nestedSchema, nestedTypeName, newPath, context, namer, baseNameParts);
      properties.push({
        name: namer.createPropertyName(propId, property.name, typeName),
        type: nestedTypeName,
        comment: property.description,
        optional: !required,
      });
    } else if (typeof property.type === 'object' && 'schema' in property.type) {
      // It's a custom type
      const customType = property.type;
      const customTypeId = `${customType.name}.customType`;
      const customTypeName = namer.createTypeName(customTypeId, [customType.name, 'CustomType']);

      // Process the custom type's schema if we haven't already
      if (!context.types.find((t) => t.name === customTypeName)) {
        processSchema(customType.schema, customTypeName, [], context, namer, [customType.name]);
      }

      properties.push({
        name: namer.createPropertyName(propId, property.name, typeName),
        type: customTypeName,
        comment: property.description,
        optional: !required,
      });
    } else if (property.config?.enum) {
      // Create an enum for this property using just the property name
      const enumId = `${property.name}.enum`;
      const enumName = namer.createEnumName(enumId, [property.name, 'PropertyEnum']);

      // Only create the enum if it doesn't already exist
      if (!context.enums.find((e) => e.name === enumName)) {
        const enumMembers: EnumMemberContext[] = property.config.enum.map((value) => {
          const memberId = `${enumId}.${value}`;
          return {
            name: namer.createEnumMemberName(memberId, value, enumName),
            value: `"${value}"`,
          };
        });

        context.enums.push({
          name: enumName,
          comment: property.description,
          members: enumMembers,
        });
      }

      properties.push({
        name: namer.createPropertyName(propId, property.name, typeName),
        type: enumName,
        comment: property.description,
        optional: !required,
      });
    } else {
      // Regular primitive type
      properties.push({
        name: namer.createPropertyName(propId, property.name, typeName),
        type: property.type,
        comment: property.description,
        optional: !required,
      });
    }
  }

  // Create a new type for the current schema level.
  context.types.push({
    name: typeName,
    properties,
  });

  return properties;
}

export default platform;

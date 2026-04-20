import { ObjectSchema, Plan } from '../../plan/index.js';
import { Platform } from '../core/index.js';
import Handlebars from 'handlebars';
import { EnumMemberContext, KotlinContext, PropertyContext } from './context.js';
import { readFile } from 'fs/promises';
import { KotlinNamer } from './namer.js';

/**
 * Maps JavaScript/TypeScript types to their Kotlin equivalents
 */
const typeMap: Record<string, string> = {
  string: 'String',
  number: 'Double',
  boolean: 'Boolean',
  object: 'Any',
  null: 'Nothing',
  undefined: 'Nothing',
  any: 'Any',
};

/**
 * Kotlin Platform implementation that generates type-safe analytics bindings.
 * Transforms a tracking Plan into Kotlin data classes and functions.
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
      'Analytics.kt': content,
    };
  },
};

/**
 * Transforms a Plan into a KotlinContext containing class and function definitions.
 * - Generates a data class for each event in the plan
 * - Creates nested classes for object properties
 * - Ensures all generated names are valid Kotlin identifiers
 *
 * @param plan The analytics tracking plan to process
 * @returns Context object for template rendering
 */
function contextFromPlan(plan: Plan): KotlinContext {
  const context: KotlinContext = {
    classes: [],
    functions: [],
    enums: [],
  };
  const namer = new KotlinNamer();

  for (const rule of plan.rules) {
    const { event, schema } = rule;
    const eventName = event.name ?? '';
    const classNameParts = [eventName, event.eventType, 'Event', 'Properties'];
    const typeId = `${event.eventType}.${eventName}.type`;
    const propertyType = namer.createClassName(typeId, classNameParts);

    // Start processing from the top-level schema of the event rule.
    processSchema(schema, propertyType, [], context, namer, classNameParts.slice(0, -1));

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
 * Recursively processes an object schema to generate Kotlin class definitions.
 * Handles nested objects by creating separate data classes with appropriate naming.
 *
 * @param schema The object schema to process
 * @param className Name for the class being generated
 * @param path Current path in the object hierarchy
 * @param context The Kotlin context to enrich with classes and enums
 * @param namer Name generator for creating valid identifiers
 * @param baseNameParts Base parts of the class name (e.g., event name and type)
 * @returns Array of property contexts for the current class
 */
function processSchema(
  schema: ObjectSchema,
  className: string,
  path: string[],
  context: KotlinContext,
  namer: KotlinNamer,
  baseNameParts: string[],
): PropertyContext[] {
  const properties: PropertyContext[] = [];

  for (const key in schema.properties) {
    const propertySchema = schema.properties[key];
    const { property, required, schema: nestedSchema } = propertySchema;
    const newPath = [...path, property.name];

    const propId = `${[...baseNameParts, ...path, property.name].join('.')}.prop`;

    if (property.type === 'object' && nestedSchema) {
      // It's a nested object. Generate a new data class for it.
      const typeId = `${[...baseNameParts, ...path, property.name].join('.')}.type`;
      const nestedClassName = namer.createClassName(typeId, [
        ...baseNameParts,
        ...path,
        property.name,
        'Properties',
      ]);
      processSchema(nestedSchema, nestedClassName, newPath, context, namer, baseNameParts);
      properties.push({
        name: namer.createPropertyName(propId, property.name, className),
        type: nestedClassName,
        comment: property.description,
        optional: !required,
      });
    } else if (typeof property.type === 'object' && 'schema' in property.type) {
      // It's a custom type
      const customType = property.type;
      const customTypeId = `${customType.name}.customType`;
      const customClassName = namer.createClassName(customTypeId, [customType.name, 'CustomType']);

      // Process the custom type's schema if we haven't already
      if (!context.classes.find((c) => c.name === customClassName)) {
        processSchema(customType.schema, customClassName, [], context, namer, [customType.name]);
      }

      properties.push({
        name: namer.createPropertyName(propId, property.name, className),
        type: customClassName,
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
        name: namer.createPropertyName(propId, property.name, className),
        type: enumName,
        comment: property.description,
        optional: !required,
      });
    } else {
      // Regular primitive type
      const kotlinType = typeMap[property.type as string] ?? 'Any';
      properties.push({
        name: namer.createPropertyName(propId, property.name, className),
        type: kotlinType,
        comment: property.description,
        optional: !required,
      });
    }
  }

  // Create a new data class for the current schema level.
  context.classes.push({
    name: className,
    properties,
  });

  return properties;
}

export default platform;

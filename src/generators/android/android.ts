import camelCase from 'lodash/camelCase.js';
import upperFirst from 'lodash/upperFirst.js';
import { Type, Schema, getPropertiesSchema } from '../ast.js';
import { Generator, GeneratorClient } from '../gen.js';
import { getEnumPropertyTypes, sanitizeEnumKey, sanitizeKey } from '../utils.js';

// These contexts are what will be passed to Handlebars to perform rendering.
// Everything in these contexts should be properly sanitized.

type AndroidObjectContext = {
  // The formatted name for this object, ex: "ProductClicked"
  name: string;
};

type AndroidPropertyContext = {
  // The formatted name for this property, ex: "numAvocados".
  name: string;
  // The formatted enum name, ex: "NumAvocados".
  enumName?: string;
  // Whether this property has an enum.
  hasEnum: boolean;
  // The formatted enum values, ex: "NUM
  enumValues?: any;
  // The type of this property. ex: "String".
  type: string;
  // Whether the property is nullable (@NonNull vs @Nullable modifier).
  isVariableNullable: boolean;
  // Whether runtime error should be thrown for null payload value
  shouldThrowRuntimeError: boolean | undefined;
  // Whether this is a List property
  isListType: boolean;
  // Whether this is property can be serialized with toProperties()
  implementsSerializableProperties: boolean;
};

type AndroidTrackCallContext = {
  // The formatted function name, ex: "orderCompleted".
  functionName: string;
  propsType: string;
  propsParam: boolean;
};

export const android: Generator<
  Record<string, unknown>,
  AndroidTrackCallContext,
  AndroidObjectContext,
  AndroidPropertyContext
> = {
  generatePropertiesObject: true,
  namer: {
    // See: https://github.com/AnanthaRajuCprojects/Reserved-Key-Words-list-of-various-programming-languages/blob/master/Java%20Keywords%20List.md
    // prettier-ignore
    reservedWords: [
      "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const",
      "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float",
      "for", "goto", "if", "implement", "imports", "instanceof", "int", "interface", "long", "native",
      "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp", "super",
      "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void", "volatile", "while"
    ],
    quoteChar: '"',
    allowedIdentifierStartingChars: 'A-Za-z_',
    allowedIdentifierChars: 'A-Za-z0-9_',
  },
  generatePrimitive: async (client, schema, parentPath) => {
    let type = 'Object';
    let hasEnum = false;

    if (schema.type === Type.STRING) {
      type = 'String';
      hasEnum = !!schema.enum;
    } else if (schema.type === Type.BOOLEAN) {
      type = 'Boolean';
    } else if (schema.type === Type.INTEGER) {
      type = 'Long';
      hasEnum = !!schema.enum;
    } else if (schema.type === Type.NUMBER) {
      type = 'Double';
      hasEnum = !!schema.enum;
    }

    return {
      ...defaultPropertyContext(client, schema, type, parentPath, hasEnum),
    };
  },
  setup: async () => ({}),
  generateArray: async (client, schema, items, parentPath) => {
    return {
      ...defaultPropertyContext(client, schema, `List<${items.type}>`, parentPath),
      isListType: true,
    };
  },
  generateObject: async (client, schema, properties, parentPath) => {
    const property = defaultPropertyContext(client, schema, 'Object', parentPath);
    let object: AndroidObjectContext | undefined;

    if (properties.length > 0) {
      const className = client.namer.register(schema.name, 'class', {
        transform: (name: string) => {
          return upperFirst(camelCase(name));
        },
      });

      property.type = className;
      property.implementsSerializableProperties = true;
      object = {
        name: className,
      };
    }

    return { property, object };
  },
  generateUnion: async (client, schema, _, parentPath) => {
    // TODO: support unions
    return defaultPropertyContext(client, schema, 'Object', parentPath, !!schema.enum);
  },
  generateTrackCall: async (_client, schema, functionName, propertiesObject) => {
    const { properties } = getPropertiesSchema(schema);
    return {
      class: schema.name.replace(/\s/g, ''),
      functionName: functionName,
      propsType: propertiesObject.type,
      propsParam: !!properties.length,
    };
  },
  generateRoot: async (client, context) => {
    await Promise.all([
      client.generateFile(
        'RudderTyperAnalytics.java',
        'generators/android/templates/RudderTyperAnalytics.java.hbs',
        context,
      ),
      client.generateFile(
        'RudderTyperUtils.java',
        'generators/android/templates/RudderTyperUtils.java.hbs',
        context,
      ),
      client.generateFile(
        'SerializableProperties.java',
        'generators/android/templates/SerializableProperties.java.hbs',
        context,
      ),
      ...context.objects.map((o) =>
        o.properties.forEach((p) => {
          if (p.hasEnum) {
            // Generate the enum file
            client.generateFile(
              `${p.enumName}.java`,
              'generators/android/templates/enumeration.java.hbs',
              p,
            );
          }
        }),
      ),
      ...context.objects.map((o) =>
        client.generateFile(`${o.name}.java`, 'generators/android/templates/class.java.hbs', o),
      ),
    ]);
  },
};

const convertToEnum = (values: any[], type: string) => {
  return (
    values
      .map((value) => {
        let key, formattedValue;

        if (type === 'String' || typeof value === 'string') {
          key = 'S_' + sanitizeKey(value);
          formattedValue = `"${value.toString().replace(/"/g, '\\"').trim()}"`; // String values
        } else if (type === 'Long') {
          key = 'L_' + sanitizeKey(value);
          formattedValue = Number(value) % 1 === 0 ? `${value}L` : value.toString(); // Long values
        } else if (type === 'Double') {
          key = 'D_' + sanitizeKey(value);
          formattedValue = `${value}D`; // Double values
        }

        return `${key}(${formattedValue})`;
      })
      .join(',\n    ') + ';'
  ); // Join with commas and add semicolon at the end
};

function defaultPropertyContext(
  client: GeneratorClient,
  schema: Schema,
  type: string,
  namespace: string,
  hasEnum?: boolean,
): AndroidPropertyContext {
  return {
    name: client.namer.register(schema.name, namespace, {
      transform: camelCase,
    }),
    hasEnum: !!hasEnum,
    enumName: hasEnum
      ? client.namer.register(schema.name, namespace, {
          transform: (name) =>
            sanitizeEnumKey(camelCase(name)) + '_' + getEnumPropertyTypes(schema),
        })
      : undefined,
    enumValues: hasEnum && 'enum' in schema ? convertToEnum(schema.enum!, type) : undefined,
    type,
    isVariableNullable: !!schema.isNullable,
    shouldThrowRuntimeError: schema.isRequired && !schema.isNullable,
    isListType: false,
    implementsSerializableProperties: false,
  };
}

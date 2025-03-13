import { Type, Schema } from '../ast.js';
import Handlebars from 'handlebars';
import { Generator, BasePropertyContext, GeneratorClient } from '../gen.js';
import lodash from 'lodash';
import { registerPartial } from '../../templates.js';
import { getEnumPropertyTypes, sanitizeEnumKey, sanitizeKey } from '../utils.js';

const { camelCase, upperFirst } = lodash;

// These contexts are what will be passed to Handlebars to perform rendering.
// Everything in these contexts should be properly sanitized.

type SwiftObjectContext = {
  // The formatted name for this object, ex: "numAvocados".
  name: string;
  // Set of files that need to be imported in this file.
  imports: string[];
};

type SwiftPropertyContext = {
  // The formatted name for this property, ex: "numAvocados".
  name: string;
  // The type of this property. ex: "NSNumber".
  type: string;
  // Whether the property is nullable (nonnull vs nullable modifier).
  isVariableNullable: boolean;
  // Whether null is a valid value for this property when sent to Rudderstack.
  isPayloadFieldNullable: boolean;
  // Whether the Objective-C type is a pointer (id, SERIALIZABLE_DICT, NSNumber *, ...).
  isPointerType: boolean;
  // Note: only set if this is a class.
  // The header file containing the interface for this class.
  importName?: string;
  // Whether this property has an enum.
  hasEnum: boolean;
  // The formatted enum name
  enumName?: string;
  // The formatted enum values
  enumValues?: any;
  // The type of the enum values
  enumType?: string;
};

type SwiftTrackCallContext = {
  // The formatted function name, ex: "orderCompleted".
  functionName: string;
};

export const swift: Generator<
  Record<string, unknown>,
  SwiftTrackCallContext,
  SwiftObjectContext,
  SwiftPropertyContext
> = {
  generatePropertiesObject: false,
  namer: {
    // See: https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID413
    // prettier-ignore
    reservedWords: [
			'associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate', 'func', 'import', 'init', 
			'inout', 'internal', 'let', 'open', 'operator', 'private', 'protocol', 'public', 'rethrows', 'static',
			'struct', 'subscript', 'typealias', 'var', 'break', 'case', 'continue', 'default', 'defer', 'do', 'else', 
			'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'return', 'switch', 'where', 'while', 'as', 'Any', 
			'catch', 'false', 'is', 'nil', 'super', 'self', 'Self', 'throw', 'throws', 'true', 'try', '_', 
			'associativity', 'convenience', 'dynamic', 'didSet', 'final', 'get', 'infix', 'indirect', 'lazy', 'left', 
			'mutating', 'none', 'nonmutating', 'optional', 'override', 'postfix', 'precedence', 'prefix', 'Protocol', 
			'required', 'right', 'set', 'Type', 'unowned', 'weak', 'willSet'
		],
    quoteChar: '"',
    allowedIdentifierStartingChars: 'A-Za-z_$',
    allowedIdentifierChars: 'A-Za-z0-9_$',
  },
  setup: async () => {
    await registerPartial(
      'generators/swift/templates/functionDocumentation.hbs',
      'functionDocumentation',
    );
    Handlebars.registerHelper('propertiesDictionary', generatePropertiesDictionary);
    Handlebars.registerHelper('functionCall', generateFunctionCall);
    Handlebars.registerHelper('functionSignature', generateFunctionSignature);
    return {};
  },
  generatePrimitive: async (client, schema, parentPath) => {
    let type = 'Any';
    let isPointerType = !schema.isRequired || !!schema.isNullable;
    let hasEnum = false;

    if (schema.type === Type.STRING) {
      type = 'String';
      isPointerType = true;
      hasEnum = !!schema.enum;
    } else if (schema.type === Type.BOOLEAN) {
      // BOOLs cannot nullable in Objective-C. Instead, use an NSNumber which can be
      // initialized like a boolean like so: [NSNumber numberWithBool:YES]
      // This is what is done behind the scenes by ruddertyper if this boolean is nonnull.
      type = 'Bool';
    } else if (schema.type === Type.INTEGER) {
      type = 'Int';
      hasEnum = !!schema.enum;
    } else if (schema.type === Type.NUMBER) {
      type = 'Decimal';
      isPointerType = true;
      hasEnum = !!schema.enum;
    }

    return defaultPropertyContext(client, schema, type, parentPath, isPointerType, hasEnum);
  },
  generateArray: async (client, schema, items, parentPath) => {
    // Objective-C doesn't support NSArray's of primitives. Therefore, we
    // map booleans and integers to NSNumbers.
    const itemsType = items.type;

    return {
      ...defaultPropertyContext(client, schema, `[${itemsType}]`, parentPath, true),
      importName: items.importName,
    };
  },
  generateObject: async (client, schema, properties, parentPath) => {
    const property = defaultPropertyContext(client, schema, '[String: Any]', parentPath, true);
    let object: SwiftObjectContext | undefined = undefined;

    if (properties.length > 0) {
      // If at least one property is set, generate a class that only allows the explicitly
      // allowed properties.
      const className = client.namer.register(schema.identifierName || schema.name, 'class', {
        transform: (name: string) => {
          return `${upperFirst(camelCase(name))}`;
        },
      });
      property.type = `${className}`;
      property.importName = `"${className}.h"`;
      object = {
        name: className,
        imports: properties.filter((p) => !!p.importName).map((p) => p.importName!),
      };
    }

    return { property, object };
  },
  generateUnion: async (client, schema, _, parentPath) => {
    // TODO: support unions in iOS
    return defaultPropertyContext(client, schema, 'Any', parentPath, true, !!schema.enum);
  },
  generateTrackCall: async (_client, _schema, functionName) => ({
    functionName: functionName,
  }),
  generateRoot: async (client, context) => {
    await Promise.all([
      client.generateFile(
        'RudderTyperAnalytics.swift',
        'generators/swift/templates/analytics.swift.hbs',
        context,
      ),
      client.generateFile(
        'RudderTyperUtils.swift',
        'generators/swift/templates/RudderTyperUtils.swift.hbs',
        context,
      ),
      client.generateFile(
        'RudderTyperSerializable.swift',
        'generators/swift/templates/RudderTyperSerializable.swift.hbs',
        context,
      ),
      ...context.objects.map((o) =>
        client.generateFile(`${o.name}.swift`, 'generators/swift/templates/class.swift.hbs', o),
      ),
    ]);
  },
};

const convertToEnum = (values: any[], type: string) => {
  return values
    .map((value) => {
      let key, formattedValue;

      if (type === 'String' || typeof value === 'string') {
        key = 'S_' + sanitizeKey(value);
        formattedValue = `"${value.toString().replace(/"/g, '\\"').trim()}"`;
      } else if (type === 'Int') {
        key = 'I_' + sanitizeKey(value);
        formattedValue = `${value}`;
      } else if (type === 'Decimal') {
        key = 'D_' + sanitizeKey(value);
        formattedValue = `${value}`;
      }

      return `case ${key} = ${formattedValue}`;
    })
    .join('\n\t\t');
};

function defaultPropertyContext(
  client: GeneratorClient,
  schema: Schema,
  type: string,
  namespace: string,
  isPointerType: boolean,
  hasEnum?: boolean,
): SwiftPropertyContext {
  return {
    name: client.namer.register(schema.name, namespace, {
      transform: camelCase,
    }),
    type,
    isVariableNullable: !schema.isRequired || !!schema.isNullable,
    isPayloadFieldNullable: !!schema.isNullable && !!schema.isRequired,
    isPointerType,
    hasEnum: !!hasEnum,
    enumName: sanitizeEnumKey(schema.name) + '_' + getEnumPropertyTypes(schema),
    enumValues: hasEnum && 'enum' in schema ? convertToEnum(schema.enum!, type) : undefined,
    enumType: type === 'Any' ? 'String' : type,
  };
}

// Handlebars partials

function generateFunctionSignature(
  functionName: string,
  properties: (BasePropertyContext & SwiftPropertyContext)[],
  withOptions: boolean,
): string {
  let signature = functionName;
  const parameters: {
    type: string;
    name: string;
    isPointerType: boolean;
    isVariableNullable: boolean;
    hasEnum?: boolean;
    enumName?: string;
  }[] = [...properties];
  if (withOptions) {
    parameters.push({
      name: 'options',
      type: 'RSOption',
      isPointerType: true,
      isVariableNullable: true,
    });
  }

  const withNullability = (property: {
    type: string;
    isPointerType: boolean;
    isVariableNullable: boolean;
    hasEnum?: boolean;
    enumName?: string;
  }) => {
    const { type, isVariableNullable, hasEnum, enumName } = property;
    if (isVariableNullable) {
      return hasEnum ? `${enumName}? = nil` : `${type}? = nil`;
    } else {
      return hasEnum ? `${enumName}` : `${type}`;
    }
  };

  signature += `(`;
  for (let index = 0; index < parameters.length; index++) {
    const parameter = parameters[index];
    signature += `${parameter.name}: ${withNullability(parameter)}`;
    if (index != parameters.length - 1) {
      signature += `, `;
    }
  }
  signature += `)`;

  return signature.trim();
}

function generateFunctionCall(
  caller: string,
  functionName: string,
  properties: (BasePropertyContext & SwiftPropertyContext)[],
  extraParameterName?: string,
  extraParameterValue?: string,
): string {
  let functionCall = functionName;
  const parameters: { name: string; value: string }[] = properties.map((p) => ({
    name: p.name,
    value: p.name,
  }));
  if (extraParameterName && extraParameterValue) {
    parameters.push({
      name: extraParameterName,
      value: extraParameterValue,
    });
  }

  functionCall += `(`;
  for (let index = 0; index < parameters.length; index++) {
    const parameter = parameters[index];
    functionCall += `${parameter.name}: ${parameter.value}`;
    if (index != parameters.length - 1) {
      functionCall += `, `;
    }
  }
  functionCall += `)`;

  return `${caller}.${functionCall.trim()}`;
}

function generatePropertiesDictionary(
  properties: (BasePropertyContext & SwiftPropertyContext)[],
  prefix?: string,
): string {
  const varOrLet = properties.length > 0 ? `var` : `let`;
  let out = varOrLet + ` properties = [String: Any]()\n`;

  for (const property of properties) {
    const name = prefix && prefix.length > 0 ? `${prefix}${property.name}` : property.name;
    const serializableName =
      property.schemaType === Type.BOOLEAN
        ? name
        : property.schemaType === Type.INTEGER
          ? name
          : property.schemaType === Type.OBJECT && !property.type.includes('[String: Any]')
            ? property.isVariableNullable
              ? `${name}?.serializableDictionary()`
              : `${name}.serializableDictionary()`
            : property.schemaType === Type.ARRAY
              ? property.isVariableNullable
                ? `${name}?.serializableArray()`
                : `${name}.serializableArray()`
              : name;

    let setter: string;
    if (property.isPointerType) {
      if (property.isPayloadFieldNullable) {
        // If the value is nil, we need to convert it from a primitive nil to NSNull (an object).
        setter = `properties["${property.rawName}"] = ${name} == nil ? NSNull() : ${serializableName}\n`;
      } else {
        setter = `properties["${property.rawName}"] = ${serializableName};\n`;
      }
    } else {
      setter = `properties["${property.rawName}"] = ${serializableName};\n`;
    }

    out += setter;
  }

  return out;
}

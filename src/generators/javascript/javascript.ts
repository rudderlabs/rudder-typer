import { Type, Schema, customTypesByEvent, CustomType, extractRefName } from '../ast.js';
import * as prettier from 'prettier';
import { transpileModule } from 'typescript';
import { Language, SDK } from '../options.js';
import {
  Generator,
  GeneratorClient,
  type File,
  generateAdvancedKeywordsDocString,
  BaseObjectContext,
} from '../gen.js';
import { toTarget, toModule } from './targets.js';
import { registerPartial } from '../../templates.js';
import lodash from 'lodash';
import { getEnumPropertyTypes, sanitizeEnumKey, sanitizeKey } from '../utils.js';
import { JSONSchema7 } from 'json-schema';

const { camelCase, upperFirst } = lodash;

// These contexts are what will be passed to Handlebars to perform rendering.
// Everything in these contexts should be properly sanitized.

type CustomTypeEnum = {
  typeName: string;
  isEnum: true;
  enumValues: { key: string; value: string }[];
};

type CustomTypeInterface = {
  typeName: string;
  isEnum: false;
  properties: {
    name: string;
    type: string;
    isRequired: boolean;
    isNullable: boolean;
    description?: string;
    advancedKeywordsDoc?: string;
  }[];
};

type CustomTypeRef = {
  name: string;
  type: string;
  isRequired: boolean;
  isNullable: boolean;
  description?: string;
  advancedKeywordsDoc?: string;
};

type JavaScriptRootContext = {
  isBrowser: boolean;
  useProxy: boolean;
};

// Represents a single exposed track() call.
type JavaScriptTrackCallContext = {
  // The formatted function name, ex: "orderCompleted".
  functionName: string;
  // The type of the analytics properties object.
  propertiesType: string;
  // The properties field is only optional in analytics.js environments where
  // no properties are required.
  isPropertiesOptional: boolean;
};

type JavaScriptObjectContext = {
  // The formatted name for this object, ex: "Planet"
  name: string;
};

type PropertyContext = {
  // The formatted name for this property, ex: "numAvocados".
  name: string;
  // The type of this property. ex: "number".
  type: string;
};

type JavaScriptPropertyContext = {
  // The formatted name for this property, ex: "numAvocados".
  name: string;
  // The type of this property. ex: "number".
  type: string;
  // Whether this property has an enum.
  hasEnum: boolean;
  // The formatted enum name
  enumName?: string;
  // The formatted enum values
  enumValues?: any;
};

function findRefInSchema(schema: JSONSchema7 | any): { refPath: string; propName: string } | null {
  if ('$ref' in schema && typeof schema.$ref === 'string' && schema.$ref.startsWith('#/$defs/')) {
    return { refPath: schema.$ref, propName: schema.name || '' };
  }

  if ('properties' in schema && schema.properties && typeof schema.properties === 'object') {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propSchema && typeof propSchema === 'object') {
        if (
          '$ref' in propSchema &&
          typeof propSchema.$ref === 'string' &&
          propSchema.$ref.startsWith('#/$defs/')
        ) {
          return { refPath: propSchema.$ref, propName };
        }

        const result = findRefInSchema(propSchema);
        if (result) return result;
      }
    }

    if ('properties' in schema.properties && typeof schema.properties.properties === 'object') {
      const innerProps = schema.properties.properties;
      for (const [propName, propSchema] of Object.entries(innerProps)) {
        if (propSchema && typeof propSchema === 'object') {
          if (
            '$ref' in propSchema &&
            typeof propSchema.$ref === 'string' &&
            propSchema.$ref.startsWith('#/$defs/')
          ) {
            return { refPath: propSchema.$ref, propName };
          }

          const result = findRefInSchema(propSchema);
          if (result) return result;
        }
      }
    }
  }

  return null;
}

function escapeAndFormatString(value: any): string {
  return `'${value.toString().replace(/'/g, "\\'").trim()}'`;
}

// Helper function to handle enum types
function processEnumType(name: string, schema: Schema): CustomTypeEnum | null {
  if (!('enum' in schema) || !schema.enum) return null;

  const typeName = upperFirst(camelCase(name));
  let enumValues;

  if (schema.type === Type.STRING) {
    enumValues = schema.enum.map((value: any) => ({
      key: `S_${sanitizeKey(value)}`,
      value: escapeAndFormatString(value),
    }));
  } else if (schema.type === Type.NUMBER || schema.type === Type.INTEGER) {
    enumValues = schema.enum.map((value: any) => ({
      key: `N_${sanitizeKey(value)}`,
      value: `${value}`,
    }));
  } else {
    return null;
  }

  return {
    typeName,
    isEnum: true,
    enumValues,
  };
}

// Helper function to handle array types
function processArrayType(
  name: string,
  schema: Schema,
  customTypeReferences: Record<string, string>,
  typeMap: Record<string, string>,
): { typeDetails: CustomTypeInterface | null; typeRef: CustomTypeRef } {
  let itemType = 'any';

  if ('items' in schema && schema.items) {
    if ('$ref' in schema.items && typeof schema.items.$ref === 'string') {
      const refName = extractRefName(schema.items.$ref);
      if (refName) {
        itemType = typeMap[refName] || `CustomTypeDefs['${refName}']`;
      }
    } else {
      itemType = getTypeForSchema(schema.items, customTypeReferences, typeMap);
    }
  }

  const typeName = upperFirst(camelCase(name));
  const typeValue = `${itemType}[]`;

  // For simple types, just return the type reference
  if (
    itemType === 'string' ||
    itemType === 'number' ||
    itemType === 'boolean' ||
    itemType === 'any'
  ) {
    return {
      typeDetails: null,
      typeRef: {
        name,
        type: typeValue,
        isRequired: !!schema.isRequired,
        isNullable: !!schema.isNullable,
        description: schema.description,
        advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
      },
    };
  }

  // For complex types, create a type definition
  return {
    typeDetails: {
      typeName,
      isEnum: false,
      properties: [
        {
          name: 'item',
          type: itemType,
          isRequired: true,
          isNullable: false,
        },
      ],
    },
    typeRef: {
      name,
      type: typeValue,
      isRequired: !!schema.isRequired,
      isNullable: !!schema.isNullable,
      description: schema.description,
      advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
    },
  };
}

// Helper function to handle object types
function processObjectType(
  name: string,
  schema: Schema,
  customTypeReferences: Record<string, string>,
  typeMap: Record<string, string>,
): { typeDetails: CustomTypeInterface; typeRef: CustomTypeRef } {
  const typeName = upperFirst(camelCase(name));
  const properties = (schema as any).properties.map((prop: Schema) => {
    let propType = '';

    if ('$ref' in prop && typeof prop.$ref === 'string') {
      const refName = extractRefName(prop.$ref);
      if (refName) {
        propType = typeMap[refName] || `CustomTypeDefs['${refName}']`;
      } else {
        propType = getTypeForSchema(prop, customTypeReferences, typeMap);
      }
    } else {
      propType = getTypeForSchema(prop, customTypeReferences, typeMap);
    }

    return {
      name: prop.name,
      type: propType,
      isRequired: !!prop.isRequired,
      isNullable: !!prop.isNullable,
      description: prop.description,
      advancedKeywordsDoc: generateAdvancedKeywordsDocString(prop),
    };
  });

  return {
    typeDetails: {
      typeName,
      isEnum: false,
      properties,
    },
    typeRef: {
      name,
      type: typeName,
      isRequired: !!schema.isRequired,
      isNullable: !!schema.isNullable,
      description: schema.description,
      advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
    },
  };
}

function processCustomType(
  customType: CustomType,
  customTypeReferences: Record<string, string>,
  typeMap: Record<string, string>,
): {
  typeDetails: CustomTypeEnum | CustomTypeInterface | null;
  typeRef: CustomTypeRef | null;
} {
  const { name, schema } = customType;

  // Handle enum types
  if (schema.type === Type.STRING || schema.type === Type.NUMBER || schema.type === Type.INTEGER) {
    const enumType = processEnumType(name, schema);
    if (enumType) {
      const typeRef = {
        name,
        type: enumType.typeName,
        isRequired: !!schema.isRequired,
        isNullable: !!schema.isNullable,
        description: schema.description,
        advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
      };
      customTypeReferences[name] = enumType.typeName;
      return { typeDetails: enumType, typeRef };
    }
  }

  // Handle array types
  if (schema.type === Type.ARRAY || (Array.isArray(schema.type) && schema.type.includes('array'))) {
    const result = processArrayType(name, schema, customTypeReferences, typeMap);
    customTypeReferences[name] = result.typeRef.type;
    return result;
  }

  // Handle object types
  if (schema.type === Type.OBJECT && 'properties' in schema) {
    const result = processObjectType(name, schema, customTypeReferences, typeMap);
    customTypeReferences[name] = result.typeRef.type;
    return result;
  }

  // Handle simple types
  const typeValue = getTypeForSchema(schema, customTypeReferences, typeMap);
  const typeRef = {
    name,
    type: typeValue,
    isRequired: !!schema.isRequired,
    isNullable: !!schema.isNullable,
    description: schema.description,
    advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
  };
  customTypeReferences[name] = typeValue;
  return { typeDetails: null, typeRef };
}

export const javascript: Generator<
  JavaScriptRootContext,
  JavaScriptTrackCallContext,
  JavaScriptObjectContext,
  JavaScriptPropertyContext
> = {
  generatePropertiesObject: true,
  namer: {
    // See: https://mathiasbynens.be/notes/reserved-keywords#ecmascript-6
    // prettier-ignore
    reservedWords: [
			'do', 'if', 'in', 'for', 'let', 'new', 'try', 'var', 'case', 'else', 'enum', 'eval', 'null', 'this',
			'true', 'void', 'with', 'await', 'break', 'catch', 'class', 'const', 'false', 'super', 'throw',
			'while', 'yield', 'delete', 'export', 'import', 'public', 'return', 'static', 'switch', 'typeof',
			'default', 'extends', 'finally', 'package', 'private', 'continue', 'debugger', 'function', 'arguments',
			'interface', 'protected', 'implements', 'instanceof',
		],
    quoteChar: "'",
    // Note: we don't support the full range of allowed JS chars, instead focusing on a subset.
    // The full regex 11k+ chars: https://mathiasbynens.be/demo/javascript-identifier-regex
    // See: https://mathiasbynens.be/notes/javascript-identifiers-es6
    allowedIdentifierStartingChars: 'A-Za-z_$',
    allowedIdentifierChars: 'A-Za-z0-9_$',
  },
  setup: async (options) => {
    await registerPartial(
      'generators/javascript/templates/setRudderTyperOptionsDocumentation.hbs',
      'setRudderTyperOptionsDocumentation',
    );
    await registerPartial(
      'generators/javascript/templates/functionDocumentation.hbs',
      'functionDocumentation',
    );
    await registerPartial(
      'generators/javascript/templates/validateAndExecute.hbs',
      'validateAndExecute',
    );

    return {
      isBrowser: options.client.sdk === SDK.WEB,
      useProxy: true,
    };
  },
  generatePrimitive: async (client, schema) => {
    // Check if this property has a $ref
    if ('$ref' in schema && typeof schema.$ref === 'string') {
      const ref = schema.$ref;
      if (ref.startsWith('#/$defs/')) {
        const typeName = ref.replace('#/$defs/', '');
        return conditionallyNullable(schema, {
          name: client.namer.escapeString(schema.name),
          type: `CustomTypeDefs['${typeName}']`,
        });
      }
    }

    // Use the recursive function to find references in nested properties
    const ref = findRefInSchema(schema);
    if (ref) {
      const typeName = ref.refPath.replace('#/$defs/', '');
      return conditionallyNullable(schema, {
        name: client.namer.escapeString(ref.propName),
        type: `CustomTypeDefs['${typeName}']`,
      });
    }

    if ('_refName' in schema && schema._refName) {
      return conditionallyNullable(schema, {
        name: client.namer.escapeString(schema.name),
        type: `CustomTypeDefs['${schema._refName}']`,
      });
    }

    let type = 'any';
    let hasEnum = false;

    if (schema.type === Type.STRING) {
      type = 'string';
      hasEnum = !!schema.enum;
    } else if (schema.type === Type.BOOLEAN) {
      type = 'boolean';
    } else if (schema.type === Type.INTEGER || schema.type === Type.NUMBER) {
      type = 'number';
      hasEnum = !!schema.enum;
    }

    return conditionallyNullable(
      schema,
      {
        name: client.namer.escapeString(schema.name),
        type,
      },
      hasEnum,
    );
  },
  generateArray: async (client, schema, items) => {
    if ('$ref' in items && typeof items.$ref === 'string' && items.$ref.startsWith('#/$defs/')) {
      const typeName = items.$ref.replace('#/$defs/', '');
      return conditionallyNullable(schema, {
        name: client.namer.escapeString(schema.name),
        type: `CustomTypeDefs['${typeName}'][]`,
      });
    }

    if ('_refName' in items && items._refName) {
      return conditionallyNullable(schema, {
        name: client.namer.escapeString(schema.name),
        type: `CustomTypeDefs['${items._refName}'][]`,
      });
    }

    const ref = findRefInSchema(items);
    if (ref) {
      const typeName = ref.refPath.replace('#/$defs/', '');
      return conditionallyNullable(schema, {
        name: client.namer.escapeString(schema.name),
        type: `CustomTypeDefs['${typeName}'][]`,
      });
    }

    return conditionallyNullable(schema, {
      name: client.namer.escapeString(schema.name),
      type: `${items.type}[]`,
    });
  },
  generateObject: async (client, schema, properties) => {
    if (properties.length === 0) {
      // If no properties are set, replace this object with a untyped map to allow any properties.
      return {
        property: conditionallyNullable(schema, {
          name: client.namer.escapeString(schema.name),
          type: 'Record<string, any>',
        }),
      };
    } else {
      // Otherwise generate an interface to represent this object.
      const interfaceName = client.namer.register(
        schema.identifierName || schema.name,
        'interface',
        {
          transform: (name: string) => upperFirst(camelCase(name)),
        },
      );

      if (
        '$ref' in schema &&
        typeof schema.$ref === 'string' &&
        schema.$ref.startsWith('#/$defs/')
      ) {
        const typeName = schema.$ref.replace('#/$defs/', '');
        return {
          property: conditionallyNullable(schema, {
            name: client.namer.escapeString(schema.name),
            type: `CustomTypeDefs['${typeName}']`,
          }),
        };
      }

      if (
        properties.length === 1 &&
        'properties' in schema &&
        Array.isArray(schema.properties) &&
        schema.properties.length === 1
      ) {
        const prop = schema.properties[0];

        if ('$ref' in prop) {
          console.log(`Property has $ref: ${prop.$ref}`);
        }

        if ('$ref' in prop && typeof prop.$ref === 'string' && prop.$ref.startsWith('#/$defs/')) {
          const refTypeName = prop.$ref.replace('#/$defs/', '');
          return {
            property: conditionallyNullable(schema, {
              name: client.namer.escapeString(schema.name),
              type: `CustomTypeDefs['${refTypeName}']`,
            }),
          };
        }
      }

      const processedProperties = properties.map((prop) => {
        if ('$ref' in prop && typeof prop.$ref === 'string' && prop.$ref.startsWith('#/$defs/')) {
          const typeName = prop.$ref.replace('#/$defs/', '');
          return {
            ...prop,
            type: `CustomTypeDefs['${typeName}']`,
          };
        }

        if ('_refName' in prop && prop._refName) {
          return {
            ...prop,
            type: `CustomTypeDefs['${prop._refName}']`,
          };
        }

        if ('properties' in prop && prop.properties && typeof prop.properties === 'object') {
          const innerProps = prop.properties;
          if (innerProps && typeof innerProps === 'object') {
            for (const [propName, propSchema] of Object.entries(innerProps)) {
              if (propSchema && typeof propSchema === 'object' && '$ref' in propSchema) {
                const ref = propSchema.$ref;
                if (typeof ref === 'string' && ref.startsWith('#/$defs/')) {
                  const typeName = ref.replace('#/$defs/', '');
                  return {
                    ...prop,
                    name: propName,
                    type: `CustomTypeDefs['${typeName}']`,
                  };
                }
              }
            }
          }
        }
        return prop;
      });

      return {
        property: conditionallyNullable(schema, {
          name: client.namer.escapeString(schema.name),
          type: interfaceName,
        }),
        object: {
          name: interfaceName,
          properties: processedProperties,
        },
      };
    }
  },
  generateUnion: async (client, schema, types) =>
    conditionallyNullable(
      schema,
      {
        name: client.namer.escapeString(schema.name),
        type: types.map((t) => t.type).join(' | '),
      },
      !!schema.enum,
    ),
  generateTrackCall: async (client, _schema, functionName, propertiesObject) => ({
    functionName: functionName,
    propertiesType: propertiesObject.type,
    isPropertiesOptional: client.options.client.sdk === SDK.WEB && !propertiesObject.isRequired,
  }),
  generateRoot: async (client, context) => {
    const customTypeReferences: Record<string, string> = {};

    const allCustomTypes: (CustomTypeEnum | CustomTypeInterface)[] = [];
    const allCustomTypeRefs: CustomTypeRef[] = [];
    const typeMap: Record<string, string> = {};

    const allTypes: CustomType[] = [];
    for (const customTypes of Object.values(customTypesByEvent)) {
      if (customTypes.length > 0) {
        allTypes.push(...customTypes);
      }
    }

    // First pass - process all custom types to build the reference lookup
    for (const customType of allTypes) {
      if (customTypeReferences[customType.name]) {
        continue;
      }

      const { typeDetails, typeRef } = processCustomType(customType, customTypeReferences, typeMap);

      if (typeDetails) {
        allCustomTypes.push(typeDetails);
      }

      if (typeRef) {
        allCustomTypeRefs.push(typeRef);
        typeMap[customType.name] = typeRef.type;
      }
    }

    // Second pass - for each interface property that references a custom type,
    for (const obj of context.objects || []) {
      if (!obj.properties) continue;

      for (let i = 0; i < obj.properties.length; i++) {
        const prop = obj.properties[i];

        for (const customTypeRef of allCustomTypeRefs) {
          if (prop.name === customTypeRef.name && prop.type === 'string[]') {
            prop.type = `CustomTypeDefs['${customTypeRef.name}']`;
          }

          if (
            prop.type === customTypeRef.type &&
            !prop.type.startsWith('CustomTypeDefs[') &&
            customTypeRef.type !== 'string' &&
            customTypeRef.type !== 'number' &&
            customTypeRef.type !== 'boolean'
          ) {
            prop.type = `CustomTypeDefs['${customTypeRef.name}']`;
          }
        }
      }
    }

    if (context.objects) {
      const objectsMap = new Map<
        string,
        JavaScriptObjectContext & BaseObjectContext<JavaScriptPropertyContext>
      >();
      for (const obj of context.objects) {
        objectsMap.set(obj.name, obj);
      }

      const filteredObjects = context.objects.filter((obj) => {
        if (!obj.properties || obj.properties.length !== 1) {
          return true;
        }

        const prop = obj.properties[0];
        if (
          prop &&
          prop.type &&
          typeof prop.type === 'string' &&
          prop.type.includes("CustomTypeDefs['")
        ) {
          // Check if this single-property interface is used as a wrapper by other interfaces
          const isUsedAsWrapper = [...objectsMap.values()].some((otherObj) => {
            return otherObj.properties?.some((otherProp) => otherProp.type === obj.name);
          });

          if (isUsedAsWrapper) {
            for (const otherObj of context.objects) {
              if (otherObj.properties) {
                for (const otherProp of otherObj.properties as JavaScriptPropertyContext[]) {
                  if (otherProp.type === obj.name) {
                    otherProp.type = prop.type;
                  }
                }
              }
            }
            return false;
          }
        }
        return true;
      });

      context.objects = filteredObjects;
    }

    if (allCustomTypes.length > 0 || allCustomTypeRefs.length > 0) {
      context.customTypes = allCustomTypes;
      context.customTypeRefs = allCustomTypeRefs;
    }

    await client.generateFile<JavaScriptRootContext>(
      client.options.client.language === Language.TYPESCRIPT ? 'index.ts' : 'index.js',
      'generators/javascript/templates/index.hbs',
      context,
    );
  },
  formatFile: async (client: GeneratorClient, file: File): Promise<File> => {
    let { contents } = file;
    // If we are generating a JavaScript client, transpile the client
    // from TypeScript into JavaScript.
    if (client.options.client.language === Language.JAVASCRIPT) {
      // If we're generating a JavaScript client, compile from TypeScript to JavaScript.
      const { outputText } = transpileModule(contents, {
        compilerOptions: {
          target: toTarget(client.options.client.scriptTarget),
          module: toModule(client.options.client.moduleTarget),
          esModuleInterop: true,
        },
      });

      contents = outputText;
    }

    // Apply stylistic formatting, via Prettier.
    const formattedContents = await prettier.format(contents, {
      parser: client.options.client.language === Language.TYPESCRIPT ? 'typescript' : 'babel',
      // Overwrite a few of the standard prettier settings to match with our RudderTyper configuration:
      tabWidth: 2,
      singleQuote: true,
      semi: false,
      trailingComma:
        client.options.client.language === Language.JAVASCRIPT &&
        client.options.client.scriptTarget === 'ES3'
          ? 'none'
          : 'es5',
    });

    return {
      ...file,
      contents: formattedContents,
    };
  },
};

const convertToEnum = (values: any[], type: string) => {
  return (
    values
      .map((value) => {
        let key, formattedValue;

        if (type === 'string' || typeof value === 'string') {
          key = 'S_' + sanitizeKey(value);
          formattedValue = escapeAndFormatString(value);
        } else if (type === 'number') {
          key = 'N_' + sanitizeKey(value);
          formattedValue = `${value}`;
        }

        return `${key} = ${formattedValue}`;
      })
      .join(',\n    ') + ','
  );
};

function conditionallyNullable(
  schema: Schema,
  property: PropertyContext,
  hasEnum?: boolean,
): JavaScriptPropertyContext {
  return {
    ...property,
    type: !!schema.isNullable && !hasEnum ? `${property.type} | null` : property.type,
    hasEnum: !!hasEnum,
    enumName: sanitizeEnumKey(schema.name) + '_' + getEnumPropertyTypes(schema),
    enumValues:
      hasEnum && 'enum' in schema ? convertToEnum(schema.enum!, property.type) : undefined,
  };
}

export function getTypeForSchema(
  schema: any,
  customTypes: Record<string, string>,
  typeMap: Record<string, string>,
): string {
  if (schema.$ref) {
    const _refName = extractRefName(schema.$ref);
    if (_refName) {
      if (customTypes[_refName]) {
        return customTypes[_refName];
      }
      if (typeMap[_refName]) {
        return typeMap[_refName];
      }
      return `CustomTypeDefs['${_refName}']`;
    }
    return 'any';
  }

  if (schema.type === Type.ARRAY || (Array.isArray(schema.type) && schema.type.includes('array'))) {
    if ('items' in schema && schema.items) {
      if ('$ref' in schema.items && typeof schema.items.$ref === 'string') {
        const _refName = extractRefName(schema.items.$ref);
        if (_refName) {
          if (
            schema.items.type === Type.STRING ||
            (Array.isArray(schema.items.type) && schema.items.type.includes('string'))
          ) {
            return 'string[]';
          }
          return `CustomTypeDefs['${_refName}'][]`;
        }
      }
      const itemsType = getTypeForSchema(schema.items, customTypes, typeMap);
      return `${itemsType}[]`;
    }
    return 'any[]';
  }

  if (
    schema.type === Type.OBJECT ||
    (Array.isArray(schema.type) && schema.type.includes('object'))
  ) {
    if (!schema.properties) {
      return 'Record<string, any>';
    }

    const properties = Object.entries(schema.properties)
      .map(([key, value]) => {
        const propertySchema = value as any;
        const isRequired = schema.required?.includes(key);
        const type = getTypeForSchema(propertySchema, customTypes, typeMap);
        return `${key}${isRequired ? '' : '?'}: ${type}`;
      })
      .join(';\n  ');

    return `{\n  ${properties}\n}`;
  }

  switch (schema.type) {
    case Type.STRING:
      return 'string';
    case Type.NUMBER:
    case Type.INTEGER:
      return 'number';
    case Type.BOOLEAN:
      return 'boolean';
    case Type.OBJECT:
      return 'Record<string, any>';
    case Type.ARRAY:
      return 'any[]';
    case Type.UNION:
      return 'any';
    case Type.ANY:
    default:
      return 'any';
  }
}

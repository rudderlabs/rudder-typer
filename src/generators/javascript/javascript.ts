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
  CustomTypeEnum,
  CustomTypeInterface,
  CustomTypeRef,
} from '../gen.js';
import { toTarget, toModule } from './targets.js';
import { registerPartial } from '../../templates.js';
import lodash from 'lodash';
import { getEnumPropertyTypes, sanitizeEnumKey, sanitizeKey } from '../utils.js';

const { camelCase, upperFirst } = lodash;

// Helper class for improved type checking readability
class SchemaTypeChecker {
  static isEnumType(schema: Schema): boolean {
    return (
      schema.type === Type.STRING || schema.type === Type.NUMBER || schema.type === Type.INTEGER
    );
  }

  static isArrayType(schema: Schema): boolean {
    return (
      schema.type === Type.ARRAY || (Array.isArray(schema.type) && schema.type.includes('array'))
    );
  }

  static isObjectType(schema: Schema): boolean {
    return schema.type === Type.OBJECT && 'properties' in schema;
  }

  static isStringEnumType(schema: Schema): boolean {
    return schema.type === Type.STRING && 'enum' in schema && !!schema.enum;
  }

  static isNumberEnumType(schema: Schema): boolean {
    return (
      (schema.type === Type.NUMBER || schema.type === Type.INTEGER) &&
      'enum' in schema &&
      !!schema.enum
    );
  }

  static hasEnumValues(schema: Schema): boolean {
    return 'enum' in schema && !!schema.enum;
  }

  static hasItemsProperty(schema: Schema): boolean {
    return 'items' in schema && !!schema.items;
  }

  static hasRefProperty(obj: any): boolean {
    return '$ref' in obj && typeof obj.$ref === 'string';
  }

  static hasRefName(obj: any): boolean {
    return obj && typeof obj._refName === 'string';
  }

  static isStringType(schema: Schema): boolean {
    return (
      schema.type === Type.STRING || (Array.isArray(schema.type) && schema.type.includes('string'))
    );
  }
}

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
  // The ref name of this property.
  _refName?: string;
};

function escapeAndFormatString(value: any): string {
  return `'${value.toString().replace(/'/g, "\\'").trim()}'`;
}

// Helper function to handle enum types
function processEnumType(name: string, schema: Schema): CustomTypeEnum | null {
  if (!SchemaTypeChecker.hasEnumValues(schema)) return null;

  const isStringEnum = SchemaTypeChecker.isStringEnumType(schema);
  const isNumberEnum = SchemaTypeChecker.isNumberEnumType(schema);

  if (!isStringEnum && !isNumberEnum) return null;

  const enumValues = (schema as any).enum.map((value: any) => {
    if (isStringEnum) {
      return {
        key: `S_${sanitizeKey(value)}`,
        value: escapeAndFormatString(value),
      };
    } else {
      return {
        key: `N_${sanitizeKey(value)}`,
        value: `${value}`,
      };
    }
  });

  return {
    typeName: name.includes('_') ? name : upperFirst(camelCase(name)),
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
  const createTypeRef = (type: string) => ({
    name,
    type,
    isRequired: !!schema.isRequired,
    isNullable: !!schema.isNullable,
    description: schema.description,
    advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
  });

  // Default to any[] if no items specified
  if (!('items' in schema) || !schema.items) {
    return {
      typeDetails: null,
      typeRef: createTypeRef('any[]'),
    };
  }

  // Handle arrays with custom type references
  const itemRefName = (schema.items as { _refName?: string })._refName;
  if (itemRefName) {
    return {
      typeDetails: null,
      typeRef: createTypeRef(`CustomTypeDefs['${itemRefName}'][]`),
    };
  }

  // Handle arrays with $ref items
  if ('$ref' in schema.items && typeof schema.items.$ref === 'string') {
    const refName = extractRefName(schema.items.$ref);
    if (refName) {
      const itemType = typeMap[refName] || `CustomTypeDefs['${refName}']`;
      return {
        typeDetails: null,
        typeRef: createTypeRef(`${itemType}[]`),
      };
    }
  }

  // Handle arrays with other item types
  const itemType = getTypeForSchema(schema.items, customTypeReferences, typeMap);
  return {
    typeDetails: null,
    typeRef: createTypeRef(`${itemType}[]`),
  };
}

// Helper function to handle object types
function processObjectType(
  name: string,
  schema: Schema,
  customTypeReferences: Record<string, string>,
  typeMap: Record<string, string>,
  nestedEnums: CustomTypeEnum[],
): { typeDetails: CustomTypeInterface; typeRef: CustomTypeRef } {
  const typeName = upperFirst(camelCase(name));

  const getPropertyType = (prop: Schema): string => {
    // Handle ref properties
    if ('$ref' in prop) {
      const refName = extractRefName((prop as any).$ref);
      return refName ? typeMap[refName] || `CustomTypeDefs['${refName}']` : 'any';
    }

    if (SchemaTypeChecker.hasEnumValues(prop)) {
      const typeString = SchemaTypeChecker.isStringEnumType(prop) ? 'String' : 'Number';
      const enumName = `${upperFirst(camelCase(prop.name))}_${typeString}`;
      const enumType = processEnumType(enumName, prop);
      if (enumType) {
        nestedEnums.push(enumType);
        return enumType.typeName;
      }
    }

    return getTypeForSchema(prop, customTypeReferences, typeMap);
  };

  const properties = (schema as any).properties.map((prop: Schema) => ({
    name: prop.name,
    type: getPropertyType(prop),
    isRequired: !!prop.isRequired,
    isNullable: !!prop.isNullable,
    description: prop.description,
    advancedKeywordsDoc: generateAdvancedKeywordsDocString(prop),
  }));

  return {
    typeDetails: {
      typeName,
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

  const createSimpleTypeRef = (type: string) => ({
    name,
    type,
    isRequired: !!schema.isRequired,
    isNullable: !!schema.isNullable,
    description: schema.description,
    advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
  });

  if (SchemaTypeChecker.isEnumType(schema)) {
    const enumType = processEnumType(name, schema);
    if (enumType) {
      const typeRef = createSimpleTypeRef(enumType.typeName);
      customTypeReferences[name] = enumType.typeName;
      return { typeDetails: enumType, typeRef };
    }
  }

  if (SchemaTypeChecker.isArrayType(schema)) {
    const result = processArrayType(name, schema, customTypeReferences, typeMap);
    customTypeReferences[name] = result.typeRef.type;
    return result;
  }

  if (SchemaTypeChecker.isObjectType(schema)) {
    const tempNestedEnums: CustomTypeEnum[] = [];
    const result = processObjectType(name, schema, customTypeReferences, typeMap, tempNestedEnums);
    customTypeReferences[name] = result.typeRef.type;
    return result;
  }

  // Handle simple types
  const typeValue = getTypeForSchema(schema, customTypeReferences, typeMap);
  const typeRef = createSimpleTypeRef(typeValue);
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
    }
    // Otherwise generate an interface to represent this object.
    const interfaceName = client.namer.register(schema.identifierName || schema.name, 'interface', {
      transform: (name: string) => upperFirst(camelCase(name)),
    });

    return {
      property: conditionallyNullable(schema, {
        name: client.namer.escapeString(schema.name),
        type: interfaceName,
      }),
      object: {
        name: interfaceName,
      },
    };
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
    const nestedEnums: CustomTypeEnum[] = [];

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

      // Process nested enums from object properties
      if (customType.schema.type === Type.OBJECT && 'properties' in customType.schema) {
        processObjectType(
          customType.name,
          customType.schema,
          customTypeReferences,
          typeMap,
          nestedEnums,
        );
      }
    }

    // Add collected nested enums to allCustomTypes
    allCustomTypes.push(...nestedEnums);

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
      // Add customTypeRefsByName for Handlebars lookup
      context.customTypeRefsByName = Object.fromEntries(
        allCustomTypeRefs.map((ref) => [ref.name, ref]),
      );
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
    _refName: schema._refName,
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

  if (schema.enum && SchemaTypeChecker.isEnumType(schema)) {
    const enumName = sanitizeEnumKey(schema.name) + '_' + getEnumPropertyTypes(schema);
    return enumName;
  }

  if (SchemaTypeChecker.isArrayType(schema)) {
    if ('items' in schema && schema.items) {
      if (SchemaTypeChecker.hasRefProperty(schema.items)) {
        const _refName = extractRefName(schema.items.$ref);
        if (_refName) {
          if (SchemaTypeChecker.isStringType(schema.items)) {
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

    return `{
  ${properties}
}`;
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

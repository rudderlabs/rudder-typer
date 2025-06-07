import { Type, Schema } from '../ast.js';
import * as prettier from 'prettier';
import { transpileModule } from 'typescript';
import { Language, SDK } from '../options.js';
import { Generator, GeneratorClient, type File } from '../gen.js';
import { toTarget, toModule } from './targets.js';
import { registerPartial } from '../../templates.js';
import lodash from 'lodash';
import { getEnumPropertyTypes, sanitizeEnumKey, sanitizeKey } from '../utils.js';

const { camelCase, upperFirst } = lodash;

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
// function processEnumType(name: string, schema: Schema): CustomTypeEnum | null {
//   if (!SchemaTypeChecker.hasEnumValues(schema)) return null;

//   const isStringEnum = SchemaTypeChecker.isStringEnumType(schema);
//   const isNumberEnum = SchemaTypeChecker.isNumberEnumType(schema);

//   if (!isStringEnum && !isNumberEnum) return null;

//   const enumValues = (schema as any).enum.map((value: any) => {
//     if (isStringEnum) {
//       return {
//         key: `S_${sanitizeKey(value)}`,
//         value: escapeAndFormatString(value),
//       };
//     } else {
//       return {
//         key: `N_${sanitizeKey(value)}`,
//         value: `${value}`,
//       };
//     }
//   });

//   return {
//     typeName: name.includes('_') ? name : upperFirst(camelCase(name)),
//     isEnum: true,
//     enumValues,
//   };
// }

// Helper function to handle array types
// function processArrayType(
//   name: string,
//   schema: Schema,
//   customTypeReferences: Record<string, string>,
//   typeMap: Record<string, string>,
// ): { typeDetails: CustomTypeInterface | null; typeRef: CustomTypeRef } {
//   const createTypeRef = (type: string) => ({
//     name,
//     type,
//     isRequired: !!schema.isRequired,
//     isNullable: !!schema.isNullable,
//     description: schema.description,
//     advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
//   });

//   // Default to any[] if no items specified
//   if (!('items' in schema) || !schema.items) {
//     return {
//       typeDetails: null,
//       typeRef: createTypeRef('any[]'),
//     };
//   }

//   // Handle arrays with custom type references
//   const itemRefName = (schema.items as { _refName?: string })._refName;
//   if (itemRefName) {
//     return {
//       typeDetails: null,
//       typeRef: createTypeRef(`CustomTypeDefs['${itemRefName}'][]`),
//     };
//   }

//   // Handle arrays with $ref items
//   if ('$ref' in schema.items && typeof schema.items.$ref === 'string') {
//     const refName = extractRefName(schema.items.$ref);
//     if (refName) {
//       const itemType = typeMap[refName] || `CustomTypeDefs['${refName}']`;
//       return {
//         typeDetails: null,
//         typeRef: createTypeRef(`${itemType}[]`),
//       };
//     }
//   }

//   // Handle arrays with other item types
//   const itemType = getTypeForSchema(schema.items, customTypeReferences, typeMap);
//   return {
//     typeDetails: null,
//     typeRef: createTypeRef(`${itemType}[]`),
//   };
// }

// Helper function to handle object types
// function processObjectType(
//   name: string,
//   schema: Schema,
//   customTypeReferences: Record<string, string>,
//   typeMap: Record<string, string>,
//   nestedEnums: CustomTypeEnum[],
// ): { typeDetails: CustomTypeInterface; typeRef: CustomTypeRef } {
//   const typeName = upperFirst(camelCase(name));

//   const getPropertyType = (prop: Schema): string => {
//     // Handle ref properties
//     if ('$ref' in prop) {
//       const refName = extractRefName((prop as any).$ref);
//       return refName ? typeMap[refName] || `CustomTypeDefs['${refName}']` : 'any';
//     }

//     if (SchemaTypeChecker.hasEnumValues(prop)) {
//       const typeString = SchemaTypeChecker.isStringEnumType(prop) ? 'String' : 'Number';
//       const enumName = `${upperFirst(camelCase(prop.name))}_${typeString}`;
//       const enumType = processEnumType(enumName, prop);
//       if (enumType) {
//         nestedEnums.push(enumType);
//         return enumType.typeName;
//       }
//     }

//     return getTypeForSchema(prop, customTypeReferences, typeMap);
//   };

//   const properties = (schema as any).properties.map((prop: Schema) => ({
//     name: prop.name,
//     type: getPropertyType(prop),
//     isRequired: !!prop.isRequired,
//     isNullable: !!prop.isNullable,
//     description: prop.description,
//     advancedKeywordsDoc: generateAdvancedKeywordsDocString(prop),
//   }));

//   return {
//     typeDetails: {
//       typeName,
//       properties,
//     },
//     typeRef: {
//       name,
//       type: typeName,
//       isRequired: !!schema.isRequired,
//       isNullable: !!schema.isNullable,
//       description: schema.description,
//       advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
//     },
//   };
// }

// function processCustomType(
//   customType: CustomType,
//   customTypeReferences: Record<string, string>,
//   typeMap: Record<string, string>,
// ): {
//   typeDetails: CustomTypeEnum | CustomTypeInterface | null;
//   typeRef: CustomTypeRef | null;
// } {
//   const { name, schema } = customType;

//   const createSimpleTypeRef = (type: string) => ({
//     name,
//     type,
//     isRequired: !!schema.isRequired,
//     isNullable: !!schema.isNullable,
//     description: schema.description,
//     advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
//   });

//   if (SchemaTypeChecker.isEnumType(schema)) {
//     const enumType = processEnumType(name, schema);
//     if (enumType) {
//       const typeRef = createSimpleTypeRef(enumType.typeName);
//       customTypeReferences[name] = enumType.typeName;
//       return { typeDetails: enumType, typeRef };
//     }
//   }

//   if (SchemaTypeChecker.isArrayType(schema)) {
//     const result = processArrayType(name, schema, customTypeReferences, typeMap);
//     customTypeReferences[name] = result.typeRef.type;
//     return result;
//   }

//   if (SchemaTypeChecker.isObjectType(schema)) {
//     const tempNestedEnums: CustomTypeEnum[] = [];
//     const result = processObjectType(name, schema, customTypeReferences, typeMap, tempNestedEnums);
//     customTypeReferences[name] = result.typeRef.type;
//     return result;
//   }

//   // Handle simple types
//   const typeValue = getTypeForSchema(schema, customTypeReferences, typeMap);
//   const typeRef = createSimpleTypeRef(typeValue);
//   customTypeReferences[name] = typeValue;
//   return { typeDetails: null, typeRef };
// }

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

    if (schema._refName) {
      return conditionallyNullable(
        schema,
        {
          name: client.namer.escapeString(schema.name),
          type: `CustomTypeDefs['${schema._refName}']`,
        },
        hasEnum,
      );
    }

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
    if (items._refName) {
      return conditionallyNullable(schema, {
        name: client.namer.escapeString(schema.name),
        type: `CustomTypeDefs['${items._refName}'][]`,
      });
    }

    return conditionallyNullable(
      schema,
      {
        name: client.namer.escapeString(schema.name),
        type: `${items.type}[]`,
      },
      false,
    );
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
  const unionTypes = [...new Set(type.split(' | '))];

  return (
    values
      .map((value) => {
        let key, formattedValue;

        if (type === 'number' || (unionTypes.includes('number') && typeof value === 'number')) {
          key = 'N_' + sanitizeKey(value);
          formattedValue = `${value}`;
        } else if (
          type === 'string' ||
          (unionTypes.includes('string') && typeof value === 'string')
        ) {
          key = 'S_' + sanitizeKey(value);
          formattedValue = `'${value.toString().replace(/'/g, "\\'").trim()}'`;
        }

        return key && formattedValue ? `${key} = ${formattedValue}` : null;
      })
      .filter(Boolean)
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

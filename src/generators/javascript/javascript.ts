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

function processCustomType(
  customType: CustomType,
  customTypeReferences: Record<string, string>,
): {
  typeDetails: CustomTypeEnum | CustomTypeInterface | null;
  typeRef: CustomTypeRef | null;
} {
  const { name, schema } = customType;

  let typeDetails: CustomTypeEnum | CustomTypeInterface | null = null;
  let typeRef: CustomTypeRef | null = null;
  let typeValue: string = 'any';

  // Handle enum types
  if (schema.type === Type.STRING && 'enum' in schema && schema.enum) {
    const typeName = upperFirst(camelCase(name));
    const enumValues = schema.enum.map((value: any) => {
      const key = `S_${sanitizeKey(value)}`;
      const stringValue = `'${String(value).replace(/'/g, "\\'").trim()}'`;
      return { key, value: stringValue };
    });

    typeDetails = {
      typeName,
      isEnum: true,
      enumValues,
    };

    typeValue = typeName;
  } else if (schema.type === Type.BOOLEAN && 'enum' in schema && schema.enum) {
    typeValue = 'boolean';
    typeDetails = null;
  } else if (
    (schema.type === Type.NUMBER || schema.type === Type.INTEGER) &&
    'enum' in schema &&
    schema.enum
  ) {
    const typeName = upperFirst(camelCase(name));
    const enumValues = schema.enum.map((value: any) => {
      const key = `N_${sanitizeKey(value)}`;
      const numValue = `${value}`;
      return { key, value: numValue };
    });

    typeDetails = {
      typeName,
      isEnum: true,
      enumValues,
    };

    typeValue = typeName;
  }
  // Handle array types
  else if (
    schema.type === Type.ARRAY ||
    (Array.isArray(schema.type) && schema.type.includes('array'))
  ) {
    let itemType = 'any';

    // If items has a $ref, use that type
    if (
      'items' in schema &&
      schema.items &&
      typeof schema.items === 'object' &&
      '$ref' in schema.items &&
      typeof schema.items.$ref === 'string'
    ) {
      const refName = extractRefName(schema.items.$ref);
      if (refName) {
        itemType = `CustomTypeDefs['${refName}']`;
      }
    }
    // Otherwise get the type for the items
    else if ('items' in schema && schema.items) {
      itemType = getTypeForSchema(schema.items, customTypeReferences);

      const typeName = upperFirst(camelCase(name));

      typeValue = `${itemType}[]`;

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

      typeValue = typeName;

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
          type: `${itemType}[]`,
          isRequired: !!schema.isRequired,
          isNullable: !!schema.isNullable,
          description: schema.description,
          advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
        },
      };
    }

    typeValue = `${itemType}[]`;
  }
  // Handle object types
  else if (schema.type === Type.OBJECT && 'properties' in schema) {
    const typeName = upperFirst(camelCase(name));
    const properties = schema.properties.map((prop: Schema) => {
      let propType = '';
      let refName = '';

      if ('$ref' in prop && typeof prop.$ref === 'string') {
        const extractedRefName = extractRefName(prop.$ref);
        if (extractedRefName) {
          refName = extractedRefName;
          propType = `CustomTypeDefs['${refName}']`;
        } else {
          propType = getTypeForSchema(prop, customTypeReferences);
        }
      } else {
        propType = getTypeForSchema(prop, customTypeReferences);
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

    typeDetails = {
      typeName,
      isEnum: false,
      properties,
    };

    typeValue = typeName;
  }
  // Handle simple types
  else {
    typeValue = getTypeForSchema(schema, customTypeReferences);
  }

  typeRef = {
    name,
    type: typeValue,
    isRequired: !!schema.isRequired,
    isNullable: !!schema.isNullable,
    description: schema.description,
    advancedKeywordsDoc: generateAdvancedKeywordsDocString(schema),
  };

  customTypeReferences[name] = typeValue;

  return { typeDetails, typeRef };
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
    Object.keys(customTypeReferences).forEach((key) => delete customTypeReferences[key]);

    const allCustomTypes: (CustomTypeEnum | CustomTypeInterface)[] = [];
    const allCustomTypeRefs: CustomTypeRef[] = [];

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

      const { typeDetails, typeRef } = processCustomType(customType, customTypeReferences);

      if (typeDetails) {
        allCustomTypes.push(typeDetails);
      }

      if (typeRef) {
        allCustomTypeRefs.push(typeRef);
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
          formattedValue = `'${value.toString().replace(/'/g, "\\'").trim()}'`;
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

const customTypeReferences: Record<string, string> = {};

export function getTypeForSchema(schema: any, customTypes: Record<string, string>): string {
  if (schema.$ref) {
    const _refName = schema.$ref.split('/').pop();
    if (_refName) {
      if (customTypes[_refName]) {
        return customTypes[_refName];
      }
      if (customTypeReferences[_refName]) {
        return customTypeReferences[_refName];
      }
      return `CustomTypeDefs['${_refName}']`;
    }
    return 'any';
  }

  if (schema.type === 6 || (Array.isArray(schema.type) && schema.type.includes('array'))) {
    if ('items' in schema && schema.items) {
      if ('$ref' in schema.items && typeof schema.items.$ref === 'string') {
        const _refName = schema.items.$ref.split('/').pop();
        if (_refName) {
          return `CustomTypeDefs['${_refName}'][]`;
        }
      }
      const itemsType = getTypeForSchema(schema.items, customTypes);
      return `${itemsType}[]`;
    }
    return 'any[]';
  }

  if (schema.type === 5 || (Array.isArray(schema.type) && schema.type.includes('object'))) {
    if (!schema.properties) {
      return 'Record<string, any>';
    }

    const properties = Object.entries(schema.properties)
      .map(([key, value]) => {
        const propertySchema = value as any;
        const isRequired = schema.required?.includes(key);
        const type = getTypeForSchema(propertySchema, customTypes);
        return `${key}${isRequired ? '' : '?'}: ${type}`;
      })
      .join(';\n  ');

    return `{\n  ${properties}\n}`;
  }

  switch (schema.type) {
    case 1: // Type.STRING
      return 'string';
    case 4: // Type.NUMBER
    case 3: // Type.INTEGER
      return 'number';
    case 2: // Type.BOOLEAN
      return 'boolean';
    case 5: // Type.OBJECT
      return 'Record<string, any>';
    case 6: // Type.ARRAY
      return 'any[]';
    case 7: // Type.UNION
      return 'any';
    case 0: // Type.ANY
    default:
      return 'any';
  }
}

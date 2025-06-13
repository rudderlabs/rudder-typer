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
			'interface', 'protected', 'implements', 'instanceof', 'CustomTypeDefs'
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
    const overrides: Partial<JavaScriptPropertyContext>[] = [];

    if (schema._refName) {
      overrides.push({
        type: `CustomTypeDefs['${schema._refName}']`,
        hasEnum: false,
      });
    }

    if (schema.type === Type.STRING) {
      type = 'string';
      hasEnum = !!schema.enum;
      if (hasEnum) {
        const { enumName, enumValues } = generateEnum(client, schema, {
          name: client.namer.escapeString(schema.name),
          type,
        });
        overrides.push({
          enumName,
          enumValues,
        });
      }
    } else if (schema.type === Type.BOOLEAN) {
      type = 'boolean';
    } else if (schema.type === Type.INTEGER || schema.type === Type.NUMBER) {
      type = 'number';
      hasEnum = !!schema.enum;
      if (hasEnum) {
        const { enumName, enumValues } = generateEnum(client, schema, {
          name: client.namer.escapeString(schema.name),
          type,
        });
        overrides.push({
          enumName,
          enumValues,
        });
      }
    }

    return conditionallyNullable(
      schema,
      {
        name: client.namer.escapeString(schema.name),
        type,
      },
      hasEnum,
      overrides,
    );
  },
  generateArray: async (client, schema, items) => {
    return conditionallyNullable(
      schema,
      {
        name: client.namer.escapeString(schema.name),
        type: `${items.type}[]`,
      },
      false,
      items._refName
        ? [
            {
              type: `CustomTypeDefs['${items._refName}'][]`,
            },
          ]
        : undefined,
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
  generateUnion: async (client, schema, types) => {
    const hasEnum = !!schema.enum;
    const overrides: Partial<JavaScriptPropertyContext>[] = [];

    if (hasEnum) {
      const { enumName, enumValues } = generateEnum(client, schema, {
        name: client.namer.escapeString(schema.name),
        type: types.map((t) => t.type).join(' | '),
      });

      overrides.push({
        enumName,
        enumValues,
      });
    }
    return conditionallyNullable(
      schema,
      {
        name: client.namer.escapeString(schema.name),
        type: types.map((t) => t.type).join(' | '),
      },
      hasEnum,
      overrides,
    );
  },
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

function generateEnum(
  client: GeneratorClient,
  schema: Schema,
  property: PropertyContext,
): { enumName: string; enumValues: string | undefined } {
  let enumName = sanitizeEnumKey(schema.name) + '_' + getEnumPropertyTypes(schema);
  const enumValues = 'enum' in schema ? convertToEnum(schema.enum!, property.type) : undefined;

  if (
    client.options.client.language === Language.JAVASCRIPT ||
    client.options.client.language === Language.TYPESCRIPT
  ) {
    const uniqueEnums = client.options.client.uniqueEnums || false;

    if (uniqueEnums) {
      // If we are uniquefying the enums, we need to make sure
      // we register the enumname we well with the namer
      enumName = client.namer.register(enumName, 'enum');
    } else {
      client.namer.store(enumName, 'enum');
    }
  }

  return {
    enumName,
    enumValues,
  };
}

function conditionallyNullable(
  schema: Schema,
  property: PropertyContext,
  hasEnum?: boolean,
  overrides?: Partial<JavaScriptPropertyContext>[],
): JavaScriptPropertyContext {
  const context = {
    ...property,
    _refName: schema._refName,
    type: !!schema.isNullable && !hasEnum ? `${property.type} | null` : property.type,
    hasEnum: !!hasEnum,
  };

  if (overrides) {
    return {
      ...context,
      ...Object.assign({}, ...overrides),
    };
  }

  return context;
}

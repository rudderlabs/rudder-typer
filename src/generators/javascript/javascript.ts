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

// These contexts are what will be passed to Handlebars to perform rendering.
// Everything in these contexts should be properly sanitized.

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
  generateArray: async (client, schema, items) =>
    conditionallyNullable(schema, {
      name: client.namer.escapeString(schema.name),
      type: `${items.type}[]`,
    }),
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
      return {
        property: conditionallyNullable(schema, {
          name: client.namer.escapeString(schema.name),
          type: interfaceName,
        }),
        object: {
          name: interfaceName,
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
    // The properties object in a.js can be omitted if no properties are required.
    isPropertiesOptional: client.options.client.sdk === SDK.WEB && !propertiesObject.isRequired,
  }),
  generateRoot: async (client, context) => {
    // index.hbs contains all JavaScript client logic.
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

import { JSONSchema7 } from 'json-schema';
import {
  parse,
  Schema,
  getPropertiesSchema,
  Type,
  PrimitiveTypeSchema,
  getTraitsSchema,
} from './ast.js';
import { javascript } from './javascript/index.js';
import { objc } from './objc/index.js';
import { swift } from './swift/index.js';
import { android } from './android/index.js';
import { Options, SDK, Language } from './options.js';
import { registerStandardHelpers, generateFromTemplate } from '../templates.js';
import { Namer, Options as NamerOptions } from './namer.js';
import stringify from 'json-stable-stringify';
import lodash from 'lodash';

const { camelCase, upperFirst } = lodash;

export type File = {
  path: string;
  contents: string;
};

export type EventType = 'track' | 'identify' | 'group' | 'page' | 'screen';

export type RawTrackingPlan = {
  name: string;
  url: string;
  id: string;
  version: number;
  path: string;
  trackCalls: JSONSchema7[];
  screenCalls: JSONSchema7[];
  identifyCalls: JSONSchema7[];
  groupCalls: JSONSchema7[];
  pageCalls: JSONSchema7[];
};

export type TrackingPlan = {
  url: string;
  id: string;
  version: number;
  trackCalls: {
    raw: JSONSchema7;
    schema: Schema;
  }[];
  screenCalls: {
    raw: JSONSchema7;
    schema: Schema;
  }[];
  pageCalls: {
    raw: JSONSchema7;
    schema: Schema;
  }[];
  identifyCalls: {
    raw: JSONSchema7;
    schema: Schema;
  }[];
  groupCalls: {
    raw: JSONSchema7;
    schema: Schema;
  }[];
};

export type BaseRootContext<
  T extends Record<string, unknown>,
  O extends Record<string, unknown>,
  P extends Record<string, unknown>,
> = {
  isDevelopment: boolean;
  language: string;
  rudderTyperVersion: string;
  trackingPlanURL: string;
  objects: (O & BaseObjectContext<P>)[];
  tracks: (T & BaseTrackCallContext<P>)[];
  page: (T & BaseTrackCallContext<P>)[];
  screen: (T & BaseTrackCallContext<P>)[];
  identify: (T & {
    functionDescription?: string;
    rawJSONSchema: string;
    rawEventName: string;
    properties?: (P & BasePropertyContext)[];
  })[];
  group: (T & {
    functionDescription?: string;
    rawJSONSchema: string;
    rawEventName: string;
    properties?: (P & BasePropertyContext)[];
  })[];
};

export type BaseTrackCallContext<P extends Record<string, unknown>> = {
  // The optional function description.
  functionDescription?: string;
  // The raw JSON Schema for this event.
  rawJSONSchema: string;
  // The raw version of the name of this track call (the name sent to RudderStack).
  rawEventName: string;
  // The property parameters on this track call. Included if generatePropertiesObject=false.
  properties?: (P & BasePropertyContext)[];
};

export type BaseObjectContext<P extends Record<string, unknown>> = {
  description?: string;
  properties: (P & BasePropertyContext)[];
};

export type BasePropertyContext = {
  // The raw name of this property. ex: "user id"
  rawName: string;
  // The AST type of this property. ex: Type.INTEGER
  schemaType: Type;
  // The optional description of this property.
  description?: string;
  isRequired: boolean;
};

export type GeneratorClient = {
  options: GenOptions;
  namer: Namer;
  generateFile: <T extends Record<string, unknown>>(
    outputPath: string,
    templatePath: string,
    context: T,
  ) => Promise<void>;
};
/*
 * Adding a new language to RudderTyper involves implementing the interface below. The logic to traverse a
 * JSON Schema and apply this generator is in `runGenerator` below.
 *
 * Depending on what is idiomatic for each language, you may prefer for function calls to receive a single
 * object containing all analytics properties, or you may prefer to enumerate all top-level properties
 * as parameters to each function. You can toggle this behavior with `generatePropertiesObject`.
 */
export declare type Generator<
  R extends Record<string, unknown>,
  T extends Record<string, unknown>,
  O extends Record<string, unknown>,
  P extends Record<string, unknown>,
> = {
  namer: NamerOptions;
  setup: (options: GenOptions) => Promise<R>;
  generatePrimitive: (
    client: GeneratorClient,
    schema: PrimitiveTypeSchema,
    parentPath: string,
  ) => Promise<P>;
  generateArray: (
    client: GeneratorClient,
    schema: Schema,
    items: P & BasePropertyContext,
    parentPath: string,
  ) => Promise<P>;
  generateObject: (
    client: GeneratorClient,
    schema: Schema,
    properties: (P & BasePropertyContext)[],
    parentPath: string,
  ) => Promise<{ property: P; object?: O }>;
  generateUnion: (
    client: GeneratorClient,
    schema: Schema,
    types: (P & BasePropertyContext)[],
    parentPath: string,
  ) => Promise<P>;
  generateRoot: (client: GeneratorClient, context: R & BaseRootContext<T, O, P>) => Promise<void>;
  formatFile?: (client: GeneratorClient, file: File) => Promise<File>;
} & (
  | {
      generatePropertiesObject: true;
      generateTrackCall: (
        client: GeneratorClient,
        schema: Schema,
        functionName: string,
        propertiesObject: P & BasePropertyContext,
      ) => Promise<T>;
    }
  | {
      generatePropertiesObject: false;
      generateTrackCall: (
        client: GeneratorClient,
        schema: Schema,
        functionName: string,
        properties: (P & BasePropertyContext)[],
      ) => Promise<T>;
    }
);

export type GenOptions = {
  // Configuration options configured by the ruddertyper.yml config.
  client: Options;
  // The version of the RudderTyper CLI that is being used to generate clients.
  // Used for analytics purposes by the RudderTyper team.
  rudderTyperVersion: string;
  // Whether or not to generate a development bundle. If so, analytics payloads will
  // be validated against the full JSON Schema before being sent to the underlying
  // analytics instance.
  isDevelopment: boolean;
};

export async function gen(trackingPlan: RawTrackingPlan, options: GenOptions): Promise<File[]> {
  const parsedTrackingPlan = {
    url: trackingPlan.url,
    id: trackingPlan.id,
    version: trackingPlan.version,
    trackCalls: trackingPlan.trackCalls.map((s) => {
      const sanitizedSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...s,
      };
      return {
        raw: sanitizedSchema,
        schema: parse(sanitizedSchema),
      };
    }),
    screenCalls: trackingPlan.screenCalls.map((s) => {
      const sanitizedSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...s,
      };
      return {
        raw: sanitizedSchema,
        schema: parse(sanitizedSchema),
      };
    }),
    pageCalls: trackingPlan.pageCalls.map((s) => {
      const sanitizedSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...s,
      };
      return {
        raw: sanitizedSchema,
        schema: parse(sanitizedSchema),
      };
    }),
    identifyCalls: trackingPlan.identifyCalls.map((s) => {
      const sanitizedSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...s,
      };
      return {
        raw: sanitizedSchema,
        schema: parse(sanitizedSchema),
      };
    }),
    groupCalls: trackingPlan.groupCalls.map((s) => {
      const sanitizedSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...s,
      };
      return {
        raw: sanitizedSchema,
        schema: parse(sanitizedSchema),
      };
    }),
  };

  if (options.client.sdk === SDK.WEB || options.client.sdk === SDK.NODE) {
    return await runGenerator(javascript, parsedTrackingPlan, options);
  } else if (options.client.sdk === SDK.IOS) {
    if (options.client.language === Language.SWIFT) {
      return await runGenerator(swift, parsedTrackingPlan, options);
    } else {
      return await runGenerator(objc, parsedTrackingPlan, options);
    }
  } else if (options.client.sdk === SDK.ANDROID) {
    return await runGenerator(android, parsedTrackingPlan, options);
  } else {
    throw new Error(`Invalid SDK: ${options.client.sdk}`);
  }
}

async function runGenerator<
  R extends Record<string, unknown>,
  T extends Record<string, unknown>,
  O extends Record<string, unknown>,
  P extends Record<string, unknown>,
>(
  generator: Generator<R, T, O, P>,
  trackingPlan: TrackingPlan,
  options: GenOptions,
): Promise<File[]> {
  // One-time setup.
  registerStandardHelpers();
  const rootContext = await generator.setup(options);
  const context: R & BaseRootContext<T, O, P> = {
    ...rootContext,
    isDevelopment: options.isDevelopment,
    language: options.client.language,
    sdk: options.client.sdk,
    rudderTyperVersion: options.rudderTyperVersion,
    trackingPlanURL: trackingPlan.url,
    trackingPlanId: trackingPlan.id,
    trackingPlanVersion: trackingPlan.version,
    tracks: [],
    identify: [],
    page: [],
    screen: [],
    group: [],
    objects: [],
  };

  // File output.
  const files: File[] = [];
  const generateFile = async <C extends Record<string, unknown>>(
    outputPath: string,
    templatePath: string,
    fileContext: C,
  ) => {
    files.push({
      path: outputPath,
      contents: await generateFromTemplate<C & BaseRootContext<T, O, P>>(templatePath, {
        ...context,
        ...fileContext,
      }),
    });
  };

  const client: GeneratorClient = {
    options,
    namer: new Namer(generator.namer),
    generateFile,
  };

  // Core generator logic. This logic involves traversing over the underlying JSON Schema
  // and calling out to the supplied generator with each "node" in the JSON Schema that,
  // based on its AST type. Each iteration of this loop generates a "property" which
  // represents the type for a given schema. This property contains metadata such as the
  // type name (string, FooBarInterface, etc.), descriptions, etc. that are used in
  // templates.
  const traverseSchema = async (
    schema: Schema,
    parentPath: string,
    eventName: string,
  ): Promise<P & BasePropertyContext> => {
    const path = `${parentPath}->${schema.name}`;
    const base = {
      rawName: client.namer.escapeString(schema.name),
      schemaType: schema.type,
      description: schema.description,
      isRequired: !!schema.isRequired,
    };
    let p: P;
    if ([Type.ANY, Type.STRING, Type.BOOLEAN, Type.INTEGER, Type.NUMBER].includes(schema.type)) {
      // Primitives are any type that doesn't require generating a "subtype".
      p = await generator.generatePrimitive(client, schema as PrimitiveTypeSchema, parentPath);
    } else if (schema.type === Type.OBJECT) {
      // For objects, we need to recursively generate each property first.
      const properties: (P & BasePropertyContext)[] = [];
      for (const property of schema.properties) {
        properties.push(await traverseSchema(property, path, eventName));
      }

      if (parentPath !== '') {
        schema.name = eventName + upperFirst(schema.name);
      }

      const { property, object } = await generator.generateObject(
        client,
        schema,
        properties,
        parentPath,
      );
      if (object) {
        context.objects.push({
          properties,
          ...object,
        });
      }
      p = property;
    } else if (schema.type === Type.ARRAY) {
      // Arrays are another special case, because we need to generate a type to represent
      // the items allowed in this array.
      const itemsSchema: Schema = {
        name: schema.name + ' Item',
        description: schema.description,
        ...schema.items,
      };
      const items = await traverseSchema(itemsSchema, path, eventName);
      p = await generator.generateArray(client, schema, items, parentPath);
    } else if (schema.type === Type.UNION) {
      // For unions, we generate a property type to represent each of the possible types
      // then use that list of possible property types to generate a union.
      const types = await Promise.all(
        schema.types.map(async (t) => {
          const subSchema = {
            name: schema.name,
            description: schema.description,
            ...t,
          };

          return await traverseSchema(subSchema, path, eventName);
        }),
      );
      p = await generator.generateUnion(client, schema, types, parentPath);
    } else {
      throw new Error(`Invalid Schema Type: ${schema.type}`);
    }

    return {
      ...base,
      ...p,
    };
  };
  // Generate Track Calls.
  for (const { raw, schema } of trackingPlan.trackCalls) {
    let t: T;
    const functionName: string = client.namer.register(schema.name, 'function->track', {
      transform: camelCase,
    });
    if (generator.generatePropertiesObject) {
      const p = await traverseSchema(getPropertiesSchema(schema), '', functionName);
      t = await generator.generateTrackCall(client, schema, functionName, p);
    } else {
      const properties: (P & BasePropertyContext)[] = [];
      for (const property of getPropertiesSchema(schema).properties) {
        properties.push(await traverseSchema(property, schema.name, functionName));
      }
      t = {
        ...(await generator.generateTrackCall(client, schema, functionName, properties)),
        properties,
      };
    }

    context.tracks.push({
      functionDescription: schema.description,
      rawJSONSchema: stringify(raw, {
        space: '\t',
      }),
      rawEventName: client.namer.escapeString(schema.name),
      ...t,
    });
  }

  // Generate Screen Calls.
  for (const { raw, schema } of trackingPlan.screenCalls) {
    let t: T;
    if (generator.generatePropertiesObject) {
      const p = await traverseSchema(getPropertiesSchema(schema), '', 'screen');
      t = await generator.generateTrackCall(client, schema, 'screen', p);
    } else {
      const properties: (P & BasePropertyContext)[] = [];
      for (const property of getPropertiesSchema(schema).properties) {
        properties.push(await traverseSchema(property, schema.name, 'screen'));
      }
      t = {
        ...(await generator.generateTrackCall(client, schema, 'screen', properties)),
        properties,
      };
    }

    context.screen.push({
      functionDescription: schema.description,
      rawJSONSchema: stringify(raw, {
        space: '\t',
      }),
      rawEventName: client.namer.escapeString(schema.name),
      ...t,
    });
  }

  // Generate Page Calls.
  for (const { raw, schema } of trackingPlan.pageCalls) {
    let t: T;
    if (generator.generatePropertiesObject) {
      const p = await traverseSchema(getPropertiesSchema(schema), '', 'page');
      t = await generator.generateTrackCall(client, schema, 'page', p);
    } else {
      const properties: (P & BasePropertyContext)[] = [];
      for (const property of getPropertiesSchema(schema).properties) {
        properties.push(await traverseSchema(property, schema.name, 'page'));
      }
      t = {
        ...(await generator.generateTrackCall(client, schema, 'page', properties)),
        properties,
      };
    }

    context.page.push({
      functionDescription: schema.description,
      rawJSONSchema: stringify(raw, {
        space: '\t',
      }),
      rawEventName: client.namer.escapeString(schema.name),
      ...t,
    });
  }

  // Generate Group Calls.
  for (const { raw, schema } of trackingPlan.groupCalls) {
    let t: T;
    if (generator.generatePropertiesObject) {
      const p = await traverseSchema(getTraitsSchema(schema), '', 'group');
      t = await generator.generateTrackCall(client, schema, 'group', p);
    } else {
      const properties: (P & BasePropertyContext)[] = [];
      for (const property of getTraitsSchema(schema).properties) {
        properties.push(await traverseSchema(property, schema.name, 'group'));
      }
      t = {
        ...(await generator.generateTrackCall(client, schema, 'group', properties)),
        properties,
      };
    }

    context.group.push({
      functionDescription: schema.description,
      rawJSONSchema: stringify(raw, {
        space: '\t',
      }),
      rawEventName: client.namer.escapeString(schema.name),
      ...t,
    });
  }

  // Generate Identify Calls.
  for (const { raw, schema } of trackingPlan.identifyCalls) {
    let t: T;
    if (generator.generatePropertiesObject) {
      const p = await traverseSchema(getTraitsSchema(schema), '', 'identify');
      t = await generator.generateTrackCall(client, schema, 'identify', p);
    } else {
      const properties: (P & BasePropertyContext)[] = [];
      for (const property of getTraitsSchema(schema).properties) {
        properties.push(await traverseSchema(property, schema.name, 'identify'));
      }
      t = {
        ...(await generator.generateTrackCall(client, schema, 'identify', properties)),
        properties,
      };
    }

    context.identify.push({
      functionDescription: schema.description,
      rawJSONSchema: stringify(raw, {
        space: '\t',
      }),
      rawEventName: client.namer.escapeString(schema.name),
      ...t,
    });
  }
  // Perform any root-level generation.
  await generator.generateRoot(client, context);

  // Format and output all generated files.
  return await Promise.all(
    files.map(async (f) => (generator.formatFile ? generator.formatFile(client, f) : f)),
  );
}

// Legacy Code:
export type TemplateBaseContext = {
  isDevelopment: boolean;
  language: string;
  rudderTyperVersion: string;
};

export function baseContext(options: GenOptions): TemplateBaseContext {
  return {
    isDevelopment: options.isDevelopment,
    language: options.client.language,
    rudderTyperVersion: options.rudderTyperVersion,
  };
}

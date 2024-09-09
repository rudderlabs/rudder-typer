/**
 * This client was automatically generated by RudderTyper. ** Do Not Edit **
 */

/**
 * Ajv is a peer dependency for development builds. It's used to apply run-time validation
 * to message payloads before passing them on to the underlying analytics instance.
 *
 * Note that the production bundle does not depend on Ajv.
 *
 * You can install it with: `npm install --save-dev ajv`.
 *
 * In order to support run-time validation of draft-04 JSON Schema we are using `ajv-draft-04`.
 * You can install it with: `npm install --save-dev ajv-draft-04`.
 *
 */
import Ajv, { ErrorObject } from 'ajv';
import AjvDraft4 from 'ajv-draft-04';

import type {
  RudderAnalytics,
  RudderAnalyticsPreloader,
  ApiOptions,
} from '@rudderstack/analytics-js';
/**
 * The analytics instance should be available via window.rudderanalytics.
 * You can install it by following instructions at: https://www.rudderstack.com/docs/sources/event-streams/sdks/rudderstack-javascript-sdk/installation/
 */
declare global {
  interface Window {
    rudderanalytics: RudderAnalytics | RudderAnalyticsPreloader | undefined;
  }
}

type apiCallback = (data?: any) => void;

export interface Options extends ApiOptions {
  context?: Record<string, any>;
}

/** The Schema object which is being used by Ajv to validate the message */
export interface Schema {
  $schema?: string;
  description?: string;
  properties?: object;
  title?: string;
  type?: string;
}

export interface SampleEvent1 {
  /**
   * Sample property 1
   */
  'Sample property 1'?: any | null;
}

export type ViolationHandler = (message: Record<string, any>, violations: ErrorObject[]) => void;

/**
 * The default handler that is fired if none is supplied with setRudderTyperOptions.
 * This handler will log a warning message to the console.
 */
export const defaultValidationErrorHandler: ViolationHandler = (message, violations) => {
  const msg = JSON.stringify(
    {
      type: 'RudderTyper JSON Schema Validation Error',
      description:
        `You made an analytics call (${message.event}) using RudderTyper that doesn't match the ` +
        'Tracking Plan spec.',
      errors: violations,
    },
    undefined,
    2,
  );

  console.warn(msg);
};

let onViolation = defaultValidationErrorHandler;

let analytics: () => any | undefined = () => {
  return window.rudderanalytics;
};

/** Options to customize the runtime behavior of a RudderTyper client. */
export interface RudderTyperOptions {
  /**
   * Underlying analytics instance where analytics calls are forwarded on to.
   * Defaults to window.rudderanalytics.
   */
  analytics?: any;
  /**
   * Handler fired when if an event does not match its spec. This handler
   * does not fire in production mode, because it requires inlining the full
   * JSON Schema spec for each event in your Tracking Plan.
   *
   * By default, it will throw errors if NODE_ENV = "test" so that tests will fail
   * if a message does not match the spec. Otherwise, errors will be logged to stderr.
   */
  onViolation?: ViolationHandler;
}

/**
 * Updates the run-time configuration of this RudderTyper client.
 *
 * @param {RudderTyperOptions} options - the options to upsert
 *
 * @typedef {Object} RudderTyperOptions
 * @property {Rudder.AnalyticsJS} [analytics] - Underlying analytics instance where analytics
 * 		calls are forwarded on to. Defaults to window.analytics.
 * @property {Function} [onViolation] - Handler fired when if an event does not match its spec. This handler does not fire in
 * 		production mode, because it requires inlining the full JSON Schema spec for each event in your Tracking Plan. By default,
 * 		it will throw errors if NODE_ENV="test" so that tests will fail if a message does not match the spec. Otherwise, errors
 * 		will be logged to stderr.
 */
export function setRudderTyperOptions(options: RudderTyperOptions) {
  analytics = options.analytics ? () => options.analytics || window.rudderanalytics : analytics;
  onViolation = options.onViolation || onViolation;
}

/**
 * Validates a message against a JSON Schema using Ajv. If the message
 * is invalid, the `onViolation` handler will be called.
 */
async function validateAgainstSchema(message: Record<string, any>, schema: Schema) {
  let ajv;
  if (schema['$schema'] && schema['$schema'].includes('draft-04')) {
    ajv = new AjvDraft4({
      allErrors: true,
      verbose: true,
    });
  } else {
    ajv = new Ajv({
      allErrors: true,
      verbose: true,
    });
    const schemaDraft06 = await import('ajv/lib/refs/json-schema-draft-06.json');
    ajv.addMetaSchema(schemaDraft06);
  }
  if (!ajv.validate(schema, message) && ajv.errors) {
    onViolation(message, ajv.errors);
  }
}

/**
 * Helper to attach metadata on RudderTyper to outbound requests.
 * This is used for attribution and debugging by the RudderStack team.
 */
function withRudderTyperContext(message: Options = {}): Options {
  return {
    ...message,
    context: {
      ...(message.context || {}),
      ruddertyper: {
        sdk: 'analytics.js',
        language: 'typescript',
        rudderTyperVersion: '1.0.0-beta.11',
        trackingPlanId: 'tp_2kKI0i514th5OEuYi5AdsRwNlXC',
        trackingPlanVersion: 2,
      },
    },
  };
}

/**
 * @typedef SampleEvent1
 * @property {any | null} [Sample property 1] - Sample property 1
 */

/**
 * Sample event 1
 *
 * @param {SampleEvent1} [props] - The analytics properties that will be sent to RudderStack.
 * @param {Object} [options] - A dictionary of options. For example, enable or disable specific destinations for the call.
 * @param {Function} [callback] - An optional callback called after a short timeout after the analytics
 * 		call is fired.
 */
export function sampleEvent1(
  props?: SampleEvent1,
  options?: Options,
  callback?: apiCallback,
): void {
  const a = analytics();
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    description: 'Sample event 1',
    properties: {
      properties: {
        additionalProperties: false,
        properties: {
          'Sample property 1': {
            description: 'Sample property 1',
          },
        },
        required: [],
        type: 'object',
      },
    },
    title: 'Sample event 1',
    type: 'object',
  };
  const message = {
    event: 'Sample event 1',
    properties: props || {},
    options,
  };
  validateAgainstSchema(message, schema).then(() => {
    if (a) {
      a.track('Sample event 1', props || {}, withRudderTyperContext(options), callback);
    }
  });
}

const clientAPI = {
  /**
   * Updates the run-time configuration of this RudderTyper client.
   *
   * @param {RudderTyperOptions} options - the options to upsert
   *
   * @typedef {Object} RudderTyperOptions
   * @property {Rudder.AnalyticsJS} [analytics] - Underlying analytics instance where analytics
   * 		calls are forwarded on to. Defaults to window.analytics.
   * @property {Function} [onViolation] - Handler fired when if an event does not match its spec. This handler does not fire in
   * 		production mode, because it requires inlining the full JSON Schema spec for each event in your Tracking Plan. By default,
   * 		it will throw errors if NODE_ENV="test" so that tests will fail if a message does not match the spec. Otherwise, errors
   * 		will be logged to stderr.
   */
  setRudderTyperOptions,
  /**
   * Sample event 1
   *
   * @param {SampleEvent1} [props] - The analytics properties that will be sent to RudderStack.
   * @param {Object} [options] - A dictionary of options. For example, enable or disable specific destinations for the call.
   * @param {Function} [callback] - An optional callback called after a short timeout after the analytics
   * 		call is fired.
   */
  sampleEvent1,
};

export const RudderTyperAnalytics = new Proxy<typeof clientAPI>(clientAPI, {
  get(target, method) {
    if (typeof method === 'string' && Object.keys(target).includes(method)) {
      return target[method as keyof typeof clientAPI];
    }

    return () => {
      console.warn(`⚠️  You made an analytics call (${String(method)}) that can't be found. Either:
    a) Re-generate your ruddertyper client: \`npx rudder-typer\`
    b) Add it to your Tracking Plan: https://app.rudderstack.com/trackingplans/tp_2kKI0i514th5OEuYi5AdsRwNlXC`);
      const a = analytics();
      if (a) {
        a.track(
          'Unknown Analytics Call Fired',
          {
            method,
          },
          withRudderTyperContext(),
        );
      }
    };
  },
});

/**
 * This client was automatically generated by RudderTyper. ** Do Not Edit **
 */

import AnalyticsNode, {
  apiObject as ApiObject,
  apiCallback,
  TrackParams,
  PageParams,
  ScreenParams,
  IdentifyParams,
  GroupParams,
} from '@rudderstack/rudder-sdk-node';

/**
 * An ID associated with the user. Note: at least one of userId or anonymousId must be included!
 **/
type IdentityOptions =
  | { userId: string; anonymousId?: string }
  | { userId?: string; anonymousId: string };

export type TrackMessage<PropertiesType> = {
  properties: PropertiesType;
} & Omit<TrackParams, 'event' | 'properties'> &
  IdentityOptions &
  Record<string, any>;

export type PageMessage<PropertiesType> = {
  properties: PropertiesType;
} & Omit<PageParams, 'name' | 'properties'> &
  IdentityOptions &
  Record<string, any>;

export type ScreenMessage<PropertiesType> = {
  properties: PropertiesType;
} & Omit<ScreenParams, 'name' | 'properties'> &
  IdentityOptions &
  Record<string, any>;

export type IdentifyMessage<PropertiesType> = {
  traits: PropertiesType;
} & Omit<IdentifyParams, 'traits'> &
  IdentityOptions &
  Record<string, any>;

export type GroupMessage<PropertiesType> = {
  groupId: string;
  traits: PropertiesType;
} & Omit<GroupParams, 'groupId' | 'traits'> &
  IdentityOptions &
  Record<string, any>;

export type PayloadMessage<PropertiesType> =
  | TrackMessage<PropertiesType>
  | PageMessage<PropertiesType>
  | ScreenMessage<PropertiesType>
  | IdentifyMessage<PropertiesType>
  | GroupMessage<PropertiesType>;

export interface SampleEvent1 extends ApiObject {
  /**
   * Sample property 1
   */
  'Sample property 1'?: any | null;
}

export interface Screen extends ApiObject {
  'Sample property 1'?: any | null;
}

export interface Page extends ApiObject {
  'Sample property 1'?: any | null;
}

export interface Group extends ApiObject {
  'Sample property 1'?: any | null;
}

export interface Identify extends ApiObject {
  'Sample property 1'?: any | null;
}

export type ViolationHandler = (
  message: PayloadMessage<Record<string, any>>,
  violations: any[],
) => void;

const missingAnalyticsNodeError = new Error(`You must set an analytics-node instance:

>	const RudderAnalytics = require('@rudderstack/rudder-sdk-node');
>	const { setRudderTyperOptions } = require('./analytics')
>
>	const analytics = new RudderAnalytics(WRITE_KEY, DATA_PLANE_URL/v1/batch)
>	setRudderTyperOptions({
>		analytics: analytics,
>	})

For more information on analytics-node, see: https://docs.rudderstack.com/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk#installing-the-rudderstack-node-js-sdk
`);

let analytics: () => AnalyticsNode | undefined = () => {
  throw missingAnalyticsNodeError;
};

/** Options to customize the runtime behavior of a RudderTyper client. */
export interface RudderTyperOptions {
  /**
   * Underlying analytics instance where analytics calls are forwarded on to.
   */
  analytics: AnalyticsNode;
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
 * This function must be called with a configured analytics-node instance before firing
 * any analytics calls, or else a `missingAnalyticsNodeError` error will be thrown.
 *
 * @param {RudderTyperOptions} options - the options to upsert
 *
 * @typedef {Object} RudderTyperOptions
 * @property {Rudder.AnalyticsNode} analytics - Underlying analytics instance where analytics
 * 		calls are forwarded on to.
 * @property {Function} [onViolation] - Handler fired when if an event does not match its spec. This handler does not fire in
 * 		production mode, because it requires inlining the full JSON Schema spec for each event in your Tracking Plan. By default,
 * 		it will throw errors if NODE_ENV="test" so that tests will fail if a message does not match the spec. Otherwise, errors
 * 		will be logged to stderr.
 */
export function setRudderTyperOptions(options: RudderTyperOptions) {
  analytics = options.analytics ? () => options.analytics : analytics;
}

/**
 * Helper to attach metadata on RudderTyper to outbound requests.
 * This is used for attribution and debugging by the RudderStack team.
 */
function withRudderTyperContext<P, T extends PayloadMessage<P>>(message: T): T {
  return {
    ...message,
    context: {
      ...((message.context as ApiObject) || {}),
      ruddertyper: {
        sdk: 'analytics-node',
        language: 'typescript',
        rudderTyperVersion: '1.2.0',
        trackingPlanId: 'tp_2kKI0i514th5OEuYi5AdsRwNlXC',
        trackingPlanVersion: 3,
      },
    },
  };
}

/**
 * A message payload for an analytics-node `.track()` call.
 * See: https://docs.rudderstack.com/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk#track
 *
 * @typedef TrackMessage<PropertiesType>
 * @property {string | number} [userId] - The ID for this user in your database.
 * @property {string | number} [anonymousId] - An ID to associated with the user when you don't know who they are.
 * @property {PropertiesType} [properties] - A dictionary of properties for the event.
 * @property {Date} [timestamp] - A Javascript date object representing when the track took place. If the track
 * 		just happened, leave it out and we'll use the server's time. If you're importing data from the past make
 * 		sure you to send a timestamp.
 * @template PropertiesType
 */

/**
 * A message payload for an analytics-node `.page()` call.
 * See: https://docs.rudderstack.com/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk#page
 * @typedef PageMessage<PropertiesType>
 * @property {string | number} [userId] - The ID for this user in your database.
 * @property {string | number} [anonymousId] - An ID to associated with the user when you don't know who they are.
 * @property {string} name - The name of the page viewed.
 * @property {PropertiesType} [properties] - A dictionary of properties for the event.
 * @property {Date} [timestamp] - A Javascript date object representing when the track took place. If the track
 * 		just happened, leave it out and we'll use the server's time. If you're importing data from the past make
 * 		sure you to send a timestamp.
 * @template PropertiesType
 */

/**
 * A message payload for an analytics-node `.screen()` call.
 * See: https://docs.rudderstack.com/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk#screen
 * @typedef ScreenMessage<PropertiesType>
 * @property {string | number} [userId] - The ID for this user in your database.
 * @property {string | number} [anonymousId] - An ID to associated with the user when you don't know who they are.
 * @property {string} name - The name of the screen viewed.
 * @property {PropertiesType} [properties] - A dictionary of properties for the event.
 * @property {Date} [timestamp] - A Javascript date object representing when the track took place. If the track
 * 		just happened, leave it out and we'll use the server's time. If you're importing data from the past make
 * 		sure you to send a timestamp.
 * @template PropertiesType
 */

/**
 * A message payload for an analytics-node `.identify()` call.
 * See: https://docs.rudderstack.com/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk#identify
 * @typedef IdentifyMessage<PropertiesType>
 * @property {string | number} [userId] - The ID for this user in your database.
 * @property {string | number} [anonymousId] - An ID to associated with the user when you don't know who they are.
 * @property {PropertiesType} [traits] - A dictionary of traits for the user.
 * @property {Date} [timestamp] - A Javascript date object representing when the track took place. If the track
 * 		just happened, leave it out and we'll use the server's time. If you're importing data from the past make
 * 		sure you to send a timestamp.
 * @template PropertiesType
 */

/**
 * A message payload for an analytics-node `.group()` call.
 * See: https://docs.rudderstack.com/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk#group
 * @typedef GroupMessage<PropertiesType>
 * @property {string | number} [userId] - The ID for this user in your database.
 * @property {string | number} [anonymousId] - An ID to associated with the user when you don't know who they are.
 * @property {string} groupId - The ID for this group in your database.
 * @property {PropertiesType} [traits] - A dictionary of traits for the group.
 * @property {Date} [timestamp] - A Javascript date object representing when the track took place. If the track
 * 		just happened, leave it out and we'll use the server's time. If you're importing data from the past make
 * 		sure you to send a timestamp.
 * @template PropertiesType
 */

/**
 * @typedef SampleEvent1
 * @property {any | null} [Sample property 1] - Sample property 1
 */
/**
 * @typedef Screen
 * @property {any | null} [Sample property 1] -
 */
/**
 * @typedef Page
 * @property {any | null} [Sample property 1] -
 */
/**
 * @typedef Group
 * @property {any | null} [Sample property 1] -
 */
/**
 * @typedef Identify
 * @property {any | null} [Sample property 1] -
 */

/**
 * Sample event 1
 *
 * @param {TrackMessage<SampleEvent1>} message - The analytics properties that will be sent to RudderStack.
 * @param {Function} [callback] - An optional callback called after a short timeout after the analytics call is fired.
 */
export function sampleEvent1(
  trackMessage: TrackMessage<SampleEvent1>,
  callback?: apiCallback,
): void {
  const message = withRudderTyperContext({
    ...trackMessage,
    event: 'Sample event 1',
  });
  const a = analytics();

  if (a) {
    a.track(message, callback);
  } else {
    throw missingAnalyticsNodeError;
  }
}

/**
 * Sample Page event
 *
 * @param {PageMessage<Page>} message - The analytics properties that will be sent to RudderStack.
 * @param {Function} [callback] - An optional callback called after a short timeout after the analytics call is fired.
 */
export function page(pageMessage: PageMessage<Page>, callback?: apiCallback): void {
  const message = withRudderTyperContext({
    name: '',
    ...pageMessage,
  });
  const a = analytics();

  if (a) {
    a.page(message, callback);
  } else {
    throw missingAnalyticsNodeError;
  }
}

/**
 * Sample Screen event
 *
 * @param {ScreenMessage<Screen>} message - The analytics properties that will be sent to RudderStack.
 * @param {Function} [callback] - An optional callback called after a short timeout after the analytics call is fired.
 */
export function screen(screenMessage: ScreenMessage<Screen>, callback?: apiCallback): void {
  const message = withRudderTyperContext({
    name: '',
    ...screenMessage,
  });
  const a = analytics();

  if (a) {
    a.screen(message, callback);
  } else {
    throw missingAnalyticsNodeError;
  }
}

/**
 * Sample Identify event
 *
 * @param {IdentifyMessage<Identify>} message - The analytics properties that will be sent to RudderStack.
 * @param {Function} [callback] - An optional callback called after a short timeout after the analytics call is fired.
 */
export function identify(identifyMessage: IdentifyMessage<Identify>, callback?: apiCallback): void {
  const message = withRudderTyperContext({
    ...identifyMessage,
  });
  const a = analytics();

  if (a) {
    a.identify(message, callback);
  } else {
    throw missingAnalyticsNodeError;
  }
}

/**
 * Sample Group event
 *
 * @param {GroupMessage<Group>} message - The analytics properties that will be sent to RudderStack.
 * @param {Function} [callback] - An optional callback called after a short timeout after the analytics call is fired.
 */
export function group(groupMessage: GroupMessage<Group>, callback?: apiCallback): void {
  const message = withRudderTyperContext({
    groupId: '',
    ...groupMessage,
  });
  const a = analytics();

  if (a) {
    a.group(message, callback);
  } else {
    throw missingAnalyticsNodeError;
  }
}

const clientAPI = {
  /**
   * Updates the run-time configuration of this RudderTyper client.
   * This function must be called with a configured analytics-node instance before firing
   * any analytics calls, or else a `missingAnalyticsNodeError` error will be thrown.
   *
   * @param {RudderTyperOptions} options - the options to upsert
   *
   * @typedef {Object} RudderTyperOptions
   * @property {Rudder.AnalyticsNode} analytics - Underlying analytics instance where analytics
   * 		calls are forwarded on to.
   * @property {Function} [onViolation] - Handler fired when if an event does not match its spec. This handler does not fire in
   * 		production mode, because it requires inlining the full JSON Schema spec for each event in your Tracking Plan. By default,
   * 		it will throw errors if NODE_ENV="test" so that tests will fail if a message does not match the spec. Otherwise, errors
   * 		will be logged to stderr.
   */
  setRudderTyperOptions,
  /**
   * Sample event 1
   *
   * @param {TrackMessage<SampleEvent1>} message - The analytics properties that will be sent to RudderStack.
   * @param {Function} [callback] - An optional callback called after a short timeout after the analytics call is fired.
   */
  sampleEvent1,
  /**
   * Sample Page event
   *
   * @param {PageMessage<Page>} message - The analytics properties that will be sent to RudderStack.
   * @param {Function} [callback] - An optional callback called after a short timeout after the analytics call is fired.
   */
  page,
  /**
   * Sample Screen event
   *
   * @param {ScreenMessage<Screen>} message - The analytics properties that will be sent to RudderStack.
   * @param {Function} [callback] - An optional callback called after a short timeout after the analytics call is fired.
   */
  screen,
  /**
   * Sample Identify event
   *
   * @param {IdentifyMessage<Identify>} message - The analytics properties that will be sent to RudderStack.
   * @param {Function} [callback] - An optional callback called after a short timeout after the analytics call is fired.
   */
  identify,
  /**
   * Sample Group event
   *
   * @param {GroupMessage<Group>} message - The analytics properties that will be sent to RudderStack.
   * @param {Function} [callback] - An optional callback called after a short timeout after the analytics call is fired.
   */
  group,
};

export const RudderTyperAnalytics = new Proxy<typeof clientAPI>(clientAPI, {
  get(target, method) {
    if (typeof method === 'string' && Object.keys(target).includes(method)) {
      return target[method as keyof typeof clientAPI];
    }

    return () => {
      const a = analytics();
      if (a) {
        a.track(
          withRudderTyperContext({
            event: 'Unknown Analytics Call Fired',
            properties: {
              method: [method as string],
            },
            userId: 'ruddertyper',
          }),
        );
      }
    };
  },
});

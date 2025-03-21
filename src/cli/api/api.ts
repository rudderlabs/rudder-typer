import got from 'got';
import { JSONSchema7 } from 'json-schema';
import { wrapError, isWrappedError } from '../commands/error.js';
import { sanitizeTrackingPlan } from './trackingplans.js';
import lodash from 'lodash';
import { APIError } from '../types.js';
import { EventType } from 'src/generators/gen.js';
import packageJson from '../../../package.json' with { type: 'json' };

const { set } = lodash;

export namespace RudderAPI {
  export type GetTrackingPlanResponse = TrackingPlan;

  export type GetTrackingPlanEventsResponse = TrackingPlanEvents;

  export type GetTrackingPlanEventsRulesResponse = {
    name: string;
    description?: string;
    eventType: EventType;
    rules: JSONSchema7;
  };

  export type ListTrackingPlansResponse = {
    tracking_plans: TrackingPlan[];
  };

  export type ListTrackingPlansResponseV2 = {
    trackingPlans: TrackingPlan[];
  };

  export type TrackingPlan = {
    name: string;
    display_name: string;
    version: number;
    id: string;
    rules: {
      events: RuleMetadata[];
      global?: RuleMetadata;
      identify_traits?: RuleMetadata;
      group_traits?: RuleMetadata;
    };
    create_time: Date;
    update_time: Date;
    createdAt: Date;
    updatedAt: Date;
    creationType: string;
    workspaceId: string;
  };

  export type TrackingPlanEvents = {
    data: {
      id: string;
      name: string;
      description: string;
      eventType: string;
      categoryId: string;
      workspaceId: string;
      createdBy: string;
      updatedBy: string;
      createdAt: Date;
      updatedAt: Date;
      identitySection: string;
      additionalProperties: boolean;
    }[];
    total: number;
    currentPage: number;
    pageSize: number;
  };

  export type RuleMetadata = {
    name: string;
    description?: string;
    eventType: EventType;
    rules: JSONSchema7;
  };

  export type ListWorkspacesResponse = Workspace;

  export type Workspace = {
    name: string;
    id: string;
    createdAt: Date;
  };
}

export async function fetchTrackingPlan(options: {
  workspaceSlug: string;
  id: string;
  version?: number;
  token: string;
  email: string;
  APIVersion: string;
}): Promise<RudderAPI.TrackingPlan> {
  let response: RudderAPI.GetTrackingPlanResponse;

  const { id, version, token, email } = options;

  switch (options.APIVersion) {
    case 'v1':
      response = await _fetchTrackingPlanV1(id, version, token, email);
      break;

    case 'v2':
      response = await _fetchTrackingPlanV2(id, version, token, email);
      break;

    default:
      throw new Error(`Invalid TrackingPlan API version: ${options.APIVersion}`);
  }

  return sanitizeTrackingPlan(response);
}

async function _fetchTrackingPlanV1(
  id: string,
  version: number | undefined,
  token: string,
  email: string,
): Promise<RudderAPI.GetTrackingPlanResponse> {
  const url = version ? `trackingplans/${id}?version=${version}` : `trackingplans/${id}`;

  const response = await apiGet<RudderAPI.GetTrackingPlanResponse>(url, token, email);
  response.create_time = new Date(response.create_time);
  response.update_time = new Date(response.update_time);

  return response;
}

async function _fetchTrackingPlanV2(
  id: string,
  version: number | undefined,
  token: string,
  email: string,
): Promise<RudderAPI.GetTrackingPlanResponse> {
  const url = version ? `tracking-plans/${id}?version=${version}` : `tracking-plans/${id}`;

  const response = await apiGet<RudderAPI.GetTrackingPlanResponse>(url, token, email);
  response.createdAt = new Date(response.createdAt);
  response.updatedAt = new Date(response.updatedAt);

  const rules = await _fetchTrackingPlanV2Rules(id, token, email);
  response.rules = {
    events: rules,
  };

  return response;
}

async function _fetchTrackingPlanV2Rules(
  id: string,
  token: string,
  email: string,
): Promise<RudderAPI.RuleMetadata[]> {
  let combinedRules: RudderAPI.RuleMetadata[] = [];
  let page = 1;

  while (true) {
    const { byPage, hasNext } = await _fetchTrackingPlanV2RulesByPage(id, token, email, page);
    combinedRules = combinedRules.concat(byPage);

    if (!hasNext) {
      break;
    }
    page++;
  }

  return combinedRules;
}

async function _fetchTrackingPlanV2RulesByPage(
  id: string,
  token: string,
  email: string,
  page: number,
): Promise<{ byPage: RudderAPI.RuleMetadata[]; hasNext: boolean }> {
  const url = `tracking-plans/${id}/events?page=${page}`;

  const trackingPlanEvents = await apiGet<RudderAPI.GetTrackingPlanEventsResponse>(
    url,
    token,
    email,
  );

  const rulesPromise = trackingPlanEvents.data.map(async (ev) => {
    const url = `tracking-plans/${id}/events/${ev.id}`;
    const eventsRulesResponse = await apiGet<RudderAPI.GetTrackingPlanEventsRulesResponse>(
      url,
      token,
      email,
    );

    return {
      name: eventsRulesResponse.name,
      description: eventsRulesResponse.description,
      eventType: eventsRulesResponse.eventType,
      rules: eventsRulesResponse.rules,
    } as RudderAPI.RuleMetadata;
  });

  const byPage = await Promise.all(rulesPromise);
  const hasNext = trackingPlanEvents.total - trackingPlanEvents.pageSize * page > 0;

  return { byPage, hasNext };
}

// fetchTrackingPlans fetches all Tracking Plans accessible by a given API token
// within a specified workspace.
export async function fetchTrackingPlans(options: {
  token: string;
  email: string;
}): Promise<RudderAPI.TrackingPlan[]> {
  const response = await apiGet<RudderAPI.ListTrackingPlansResponse>(
    'trackingplans',
    options.token,
    options.email,
  );
  const v1Plans = response.tracking_plans.map((tp) => ({
    ...tp,
    createdAt: new Date(tp.create_time),
    updatedAt: new Date(tp.update_time),
  }));

  const responseV2 = await apiGet<RudderAPI.ListTrackingPlansResponseV2>(
    'tracking-plans',
    options.token,
    options.email,
  );
  const v2Plans = responseV2.trackingPlans.map((tp) => ({
    ...tp,
    createdAt: new Date(tp.createdAt),
    updatedAt: new Date(tp.updatedAt),
  }));

  return [...v1Plans, ...v2Plans];
}

// fetchWorkspace lists the workspace found with a given Rudder API token.
export async function fetchWorkspace(options: {
  token: string;
  email: string;
}): Promise<RudderAPI.Workspace> {
  const resp = await apiGet<RudderAPI.ListWorkspacesResponse>(
    'workspace',
    options.token,
    options.email,
  );
  return {
    ...resp,
    createdAt: new Date(resp.createdAt),
  };
}

// validateToken returns true if a token is a valid Rudder API token.
// Note: results are cached in-memory since it is commonly called multiple times
// for the same token (f.e. in `config/`).
type TokenValidationResult = {
  isValid: boolean;
  workspace?: RudderAPI.Workspace;
};
const tokenValidationCache: Record<string, TokenValidationResult> = {};
export async function validateToken(
  token: string | undefined,
  email: string | undefined,
): Promise<TokenValidationResult> {
  if (!token || !email) {
    return { isValid: false };
  }

  // If we don't have a cached result, query the API to find out if this is a valid token.

  if (!tokenValidationCache[token]) {
    const result: TokenValidationResult = { isValid: false };
    try {
      const workspace = await fetchWorkspace({ token, email });
      result.isValid = workspace ? true : false;
      result.workspace = workspace ? workspace : undefined;
    } catch (error) {
      // Check if this was a 403 error, which means the token is invalid.
      // Otherwise, surface the error becuase something else went wrong.
      if (!isWrappedError(error) || !error.description.toLowerCase().includes('denied')) {
        throw error;
      }
    }
    tokenValidationCache[token] = result;
  }

  return tokenValidationCache[token];
}

async function apiGet<T>(url: string, token: string, email: string): Promise<T> {
  try {
    const resp = await got(url, {
      prefixUrl:
        url === 'workspace'
          ? 'https://api.rudderstack.com/v1'
          : url.includes('trackingplans')
            ? 'https://api.rudderstack.com/v1/dg'
            : 'https://api.rudderstack.com/v2/catalog',
      headers: {
        authorization:
          url === 'workspace' || url.includes('trackingplans')
            ? `Basic ${Buffer.from(email + ':' + token).toString('base64')}`
            : 'Bearer ' + token,
        'User-Agent': `RudderTyper/${packageJson.version} Node/${process.version} Platform/${process.platform}`,
      },
      timeout: {
        request: 10000, //ms
      },
    }).json();

    return resp as T;
  } catch (error) {
    const err = error as APIError;
    // Don't include the user's authorization token. Overwrite the header value from this error.
    const tokenHeader = `Bearer ${token.trim().substring(0, 10)}... (token redacted)`;
    error = set(err, 'gotOptions.headers.authorization', tokenHeader);

    if (err.statusCode === 401 || err.statusCode === 403) {
      throw wrapError(
        'Permission denied by Rudder API',
        err,
        `Failed while querying the ${url} endpoint`,
        "Verify you are using the right API token by running 'npx rudder-typer tokens'",
      );
    } else if (err.code === 'ETIMEDOUT') {
      throw wrapError(
        'Rudder API request timed out',
        err,
        `Failed while querying the ${url} endpoint`,
      );
    }
    throw error;
  }
}

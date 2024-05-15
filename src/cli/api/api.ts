import got from 'got';
import { JSONSchema7 } from 'json-schema';
import { version } from '../../../package.json';
import { wrapError, isWrappedError } from '../commands/error';
import { sanitizeTrackingPlan } from './trackingplans';
import { set } from 'lodash';
import { APIError } from '../types';

export namespace RudderAPI {
  export type GetTrackingPlanResponse = TrackingPlan;

  export type GetTrackingPlanEventsResponse = TrackingPlanEvents;

  export type GetTrackingPlanEventsRulesResponse = {
    name: string;
    description?: string;
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
    version: string;
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
  };

  export type RuleMetadata = {
    name: string;
    description?: string;
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
  token: string;
  email: string;
  APIVersion: string;
}): Promise<RudderAPI.TrackingPlan> {
  const url =
    options.APIVersion === 'v1' ? `trackingplans/${options.id}` : `tracking-plans/${options.id}`;
  const response = await apiGet<RudderAPI.GetTrackingPlanResponse>(
    url,
    options.token,
    options.email,
  );

  if (options.APIVersion === 'v1') {
    response.create_time = new Date(response.create_time);
    response.update_time = new Date(response.update_time);
  } else {
    response.createdAt = new Date(response.createdAt);
    response.updatedAt = new Date(response.updatedAt);
  }

  if (!response.rules) {
    const url = `tracking-plans/${options.id}/events`;
    const eventsResponse = await apiGet<RudderAPI.GetTrackingPlanEventsResponse>(
      url,
      options.token,
      options.email,
    );
    let eventsRulesResponse: RudderAPI.RuleMetadata[];
    if (eventsResponse) {
      const eventsRulesResponsePromise = eventsResponse.data
        .filter(ev => ev.eventType === 'track')
        .map(async ev => {
          const url = `tracking-plans/${options.id}/events/${ev.id}`;
          const eventsRulesResponse = await apiGet<RudderAPI.GetTrackingPlanEventsRulesResponse>(
            url,
            options.token,
            options.email,
          );
          return {
            name: eventsRulesResponse.name,
            description: eventsRulesResponse.description,
            rules: eventsRulesResponse.rules,
          };
        });
      eventsRulesResponse = await Promise.all(eventsRulesResponsePromise);
      response.rules = {
        events: eventsRulesResponse,
      };
    }
  }
  return sanitizeTrackingPlan(response);
}

// fetchTrackingPlans fetches all Tracking Plans accessible by a given API token
// within a specified workspace.
export async function fetchTrackingPlans(options: {
  token: string;
  email: string;
}): Promise<RudderAPI.TrackingPlan[]> {
  let url = 'trackingplans';
  const response = await apiGet<RudderAPI.ListTrackingPlansResponse>(
    url,
    options.token,
    options.email,
  );
  response.tracking_plans.map(tp => ({
    ...tp,
    createdAt: new Date(tp.create_time),
    updatedAt: new Date(tp.update_time),
  }));

  url = 'tracking-plans';
  const responseV2 = await apiGet<RudderAPI.ListTrackingPlansResponseV2>(
    url,
    options.token,
    options.email,
  );
  responseV2.trackingPlans.map(tp => ({
    ...tp,
    createdAt: new Date(tp.createdAt),
    updatedAt: new Date(tp.updatedAt),
  }));

  return response.tracking_plans.concat(responseV2.trackingPlans);
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

async function apiGet<Response>(url: string, token: string, email: string): Promise<Response> {
  const resp = got(url, {
    baseUrl:
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
    },
    json: true,
    timeout: 10000, // ms
  });

  try {
    const { body } = await resp;
    return body;
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

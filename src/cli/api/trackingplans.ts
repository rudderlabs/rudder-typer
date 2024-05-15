import { RudderAPI } from './api';
import { TrackingPlanConfig, resolveRelativePath, verifyDirectoryExists } from '../config';
import sortKeys from 'sort-keys';
import * as fs from 'fs';
import { promisify } from 'util';
import { flow, pickBy } from 'lodash';
import stringify from 'json-stable-stringify';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

export const TRACKING_PLAN_FILENAME = 'plan.json';

export async function loadTrackingPlan(
  configPath: string | undefined,
  config: TrackingPlanConfig,
): Promise<RudderAPI.TrackingPlan | undefined> {
  const path = resolveRelativePath(configPath, config.path, TRACKING_PLAN_FILENAME);

  // Load the Tracking Plan from the local cache.
  try {
    const plan = JSON.parse(
      await readFile(path, {
        encoding: 'utf-8',
      }),
    ) as RudderAPI.TrackingPlan;

    return await sanitizeTrackingPlan(plan);
  } catch {
    // We failed to read the Tracking Plan, possibly because no plan.json exists.
    return undefined;
  }
}

export async function writeTrackingPlan(
  configPath: string | undefined,
  plan: RudderAPI.TrackingPlan,
  config: TrackingPlanConfig,
): Promise<void> {
  const path = resolveRelativePath(configPath, config.path, TRACKING_PLAN_FILENAME);
  await verifyDirectoryExists(path, 'file');

  // Perform some pre-processing on the Tracking Plan before writing it.
  const planJSON = flow<RudderAPI.TrackingPlan[], RudderAPI.TrackingPlan, string>(
    // Enforce a deterministic ordering to reduce verson control deltas.
    plan => sanitizeTrackingPlan(plan),
    plan => stringify(plan, { space: '\t' }),
  )(plan);

  await writeFile(path, planJSON, {
    encoding: 'utf-8',
  });
}

export function sanitizeTrackingPlan(plan: RudderAPI.TrackingPlan): RudderAPI.TrackingPlan {
  // TODO: on JSON Schema Draft-04, required fields must have at least one element.
  // Therefore, we strip `required: []` from your rules so this error isn't surfaced.
  const cleanupPlan = pickBy(plan, v => v !== null);
  return sortKeys(cleanupPlan, { deep: true });
}

export type TrackingPlanDeltas = {
  added: number;
  modified: number;
  removed: number;
};

export function computeDelta(
  prev: RudderAPI.TrackingPlan | undefined,
  next: RudderAPI.TrackingPlan,
): TrackingPlanDeltas {
  const deltas: TrackingPlanDeltas = {
    added: 0,
    modified: 0,
    removed: 0,
  };

  // Since we only use track calls in ruddertyper, we only changes to track calls.
  const nextByName: Record<string, RudderAPI.RuleMetadata> = {};
  for (const rule of next.rules.events) {
    nextByName[rule.name] = rule;
  }
  const prevByName: Record<string, RudderAPI.RuleMetadata> = {};
  if (!!prev) {
    for (const rule of prev.rules.events) {
      prevByName[rule.name] = rule;
    }
  }

  for (const rule of next.rules.events) {
    const prevRule = prevByName[rule.name];
    if (!prevRule) {
      deltas.added++;
    } else {
      if (JSON.stringify(rule) !== JSON.stringify(prevRule)) {
        deltas.modified++;
      }
    }
  }
  if (!!prev) {
    for (const rule of prev.rules.events) {
      if (!nextByName[rule.name]) {
        deltas.removed++;
      }
    }
  }

  return deltas;
}

export function parseTrackingPlanName(
  name: string,
): { id: string; workspaceSlug: string; APIVersion: string } {
  const parts = name.split('/');

  // Sane fallback:
  if (parts.length !== 4 || (parts[0] !== 'workspaces' && parts[2] !== 'tracking-plans')) {
    throw new Error(`Unable to parse Tracking Plan name: ${name}`);
  }

  const workspaceSlug = parts[1];
  const id = parts[3];

  return {
    id,
    workspaceSlug,
    APIVersion: 'v1',
  };
}

export function toTrackingPlanURL(trackingPlan: RudderAPI.TrackingPlan): string {
  if (!trackingPlan.creationType) {
    const { id } = parseTrackingPlanName(trackingPlan.name);
    return `https://api.rudderstack.com/trackingplans/${id}`;
  }
  return `https://api.rudderstack.com/tracking-plans/${trackingPlan.id}`;
}

export function toTrackingPlanId(trackingPlan: RudderAPI.TrackingPlan): string {
  if (!trackingPlan.creationType) {
    const { id } = parseTrackingPlanName(trackingPlan.name);
    return id;
  }
  return trackingPlan.id;
}

export function getTrackingPlanName(trackingPlan: RudderAPI.TrackingPlan): string {
  // throw new Error(`Unable to parse Tracking Plan name: ${JSON.stringify(trackingPlan)}`);
  if (!trackingPlan.creationType) {
    return trackingPlan.display_name;
  }

  return trackingPlan.name;
}

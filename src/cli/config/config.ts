import * as fs from 'fs';
import { promisify } from 'util';
import { resolve, dirname } from 'path';
import { parse } from 'yaml';
import { generateFromTemplate } from '../../templates.js';
import { homedir } from 'os';
import { Config, TrackingPlanConfig, validateConfig } from './schema.js';
import { validateToken, RudderAPI } from '../api/index.js';
import { wrapError } from '../commands/error.js';
import { runScript, Scripts } from './scripts.js';
import { APIError } from '../types.js';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

export const CONFIG_NAME = 'ruddertyper.yml';

// getConfig looks for, and reads, a ruddertyper.yml configuration file.
// If it does not exist, it will return undefined. If the configuration
// if invalid, an Error will be thrown.
// Note: path is relative to the directory where the ruddertyper command
// was run.
export async function getConfig(path = './'): Promise<Config | undefined> {
  // Check if a ruddertyper.yml exists.
  const configPath = await getPath(path);
  if (!(await exists(configPath))) {
    return undefined;
  }

  // If so, read it's contents.
  let file;
  try {
    file = await readFile(configPath, {
      encoding: 'utf-8',
    });
  } catch (error) {
    const err = error as APIError;
    throw wrapError(
      'Unable to open ruddertyper.yml',
      err,
      `Failed due to an ${err.code} error (${err.errno}).`,
      configPath,
    );
  }

  const rawConfig = parse(file);

  return validateConfig(rawConfig as Config);
}

// setConfig writes a config out to a ruddertyper.yml file.
// Note path is relative to the directory where the ruddertyper command
// was run.
export async function setConfig(config: Config, path = './'): Promise<void> {
  const file = await generateFromTemplate<Config>('cli/config/ruddertyper.yml.hbs', config, false);

  await writeFile(await getPath(path), file);
}

// resolveRelativePath resolves a relative path from the directory of the `ruddertyper.yml` config
// file. It supports file and directory paths.
export function resolveRelativePath(
  configPath: string | undefined,
  path: string,
  ...otherPaths: string[]
): string {
  // Resolve the path based on the optional --config flag.
  return configPath
    ? resolve(configPath.replace(/ruddertyper\.yml$/, ''), path, ...otherPaths)
    : resolve(path, ...otherPaths);
}

export async function verifyDirectoryExists(
  path: string,
  type: 'directory' | 'file' = 'directory',
): Promise<void> {
  // If this is a file, we need to verify it's parent directory exists.
  // If it is a directory, then we need to verify the directory itself exists.
  const dirPath = type === 'directory' ? path : dirname(path);
  if (!(await exists(dirPath))) {
    await mkdir(dirPath, {
      recursive: true,
    });
  }
}

// getToken uses a Config to fetch a RudderStack API token. It will search for it in this order:
//   1. The stdout from executing the optional token script from the config.
//   2. cat ~/.ruddertyper
// Returns undefined if no token can be found.
export async function getToken(
  cfg: Partial<Config> | undefined,
  configPath: string,
  trackingPlanConfig: TrackingPlanConfig,
): Promise<string | undefined> {
  const token = await getTokenMetadata(cfg, configPath, trackingPlanConfig);
  return token ? token.token : undefined;
}

export async function getEmail(
  cfg: Partial<Config> | undefined,
  configPath: string,
  trackingPlanConfig: TrackingPlanConfig,
): Promise<string | undefined> {
  const token = await getTokenMetadata(cfg, configPath, trackingPlanConfig);
  return token ? token.email : undefined;
}

export async function getTokenMethod(
  cfg: Partial<Config> | undefined,
  configPath: string,
): Promise<string | undefined> {
  const token = await getTokenMetadata(cfg, configPath);
  return token ? token.method : undefined;
}

async function getTokenMetadata(
  cfg: Partial<Config> | undefined,
  configPath: string,
  trackingPlanConfig?: TrackingPlanConfig,
): Promise<TokenMetadata | undefined> {
  const tokens = await listTokens(cfg, configPath, trackingPlanConfig);
  const resolutionOrder = [tokens.script, tokens.file];
  for (const metadata of resolutionOrder) {
    if (metadata.isValidToken) {
      return metadata;
    }
  }

  return undefined;
}

export type ListTokensOutput = {
  script: TokenMetadata;
  file: TokenMetadata;
};

export type TokenMetadata = {
  token?: string;
  email?: string;
  method: 'script' | 'file';
  isValidToken: boolean;
  workspace?: RudderAPI.Workspace;
};

// Only resolve token and email scripts once per CLI invocation.
// Maps a token script -> output, if any
const tokenScriptCache: Record<string, string> = {};
const emailScriptCache: Record<string, string> = {};

export async function listTokens(
  cfg: Partial<Config> | undefined,
  configPath: string,
  trackingPlanConfig?: TrackingPlanConfig,
): Promise<ListTokensOutput> {
  const output: ListTokensOutput = {
    script: { method: 'script', isValidToken: false },
    file: { method: 'file', isValidToken: false },
  };

  // Attempt to read a token and email from the ~/.ruddertyper token file.
  // Token and email are stored here during the `init` flow, if a user generates a token.
  try {
    const path = resolve(homedir(), '.ruddertyper');
    const cachedTokenData = await readFile(path, {
      encoding: 'utf-8',
    });
    output.file.token = cachedTokenData.split(',')[0].trim();
    output.file.email = cachedTokenData.split(',')[1].trim();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // Ignore errors if ~/.ruddertyper doesn't exist
  }

  // Attempt to read a token and email by executing their respective script from the ruddertyper.yml config file.
  // Handle token script errors gracefully, f.e., in CI where you don't need it.
  if (
    (cfg && cfg.scripts && cfg.scripts.token && cfg.scripts.email) ||
    (trackingPlanConfig &&
      trackingPlanConfig.scripts &&
      trackingPlanConfig.scripts.token &&
      trackingPlanConfig.scripts.email)
  ) {
    const tokenScript = (trackingPlanConfig?.scripts?.token || cfg?.scripts?.token)!;
    const emailScript = (trackingPlanConfig?.scripts?.email || cfg?.scripts?.email)!;
    // Since we don't know if this token script has side effects, cache (in-memory) the result
    // s.t. we only execute it once per CLI invocation.
    if (!tokenScriptCache[tokenScript]) {
      const stdout = await runScript(tokenScript, configPath, Scripts.Token);
      if (!!stdout) {
        tokenScriptCache[tokenScript] = stdout.trim();
      }
    }
    if (!emailScriptCache[emailScript]) {
      const stdout = await runScript(emailScript, configPath, Scripts.Email);
      if (!!stdout) {
        emailScriptCache[emailScript] = stdout.trim();
      }
    }

    output.script.token = tokenScriptCache[tokenScript];
    output.script.email = emailScriptCache[emailScript];
  }

  // Validate whether any of these tokens are valid RudderStack API tokens.
  for (const metadata of Object.values(output)) {
    const result = await validateToken(metadata.token, metadata.email);
    metadata.isValidToken = result.isValid;
    metadata.workspace = result.workspace;
  }

  return output;
}

// storeToken writes a token to ~/.ruddertyper.
export async function storeToken(token: string, email: string): Promise<void> {
  const path = resolve(homedir(), '.ruddertyper');
  return writeFile(path, token + ',' + email, 'utf-8');
}

async function getPath(path: string): Promise<string> {
  path = path.replace(/ruddertyper\.yml$/, '');
  // TODO: recursively move back folders until you find it, ala package.json
  return resolve(path, CONFIG_NAME);
}

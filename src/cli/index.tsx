#!/usr/bin/env node

// Default to production, so that React error messages are not shown.
// Note: this must happen before we import React.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

import React, { createContext } from 'react';
import { render } from 'ink';
import { Token, Version, Build, Help, Init, ErrorBoundary } from './commands';
import { Config, getConfig, getTokenMethod } from './config';
import { machineId } from 'node-machine-id';
import { version } from '../../package.json';
import { loadTrackingPlan } from './api';
import yargs from 'yargs';
import { getTrackingPlanName } from './api/trackingplans';

export type StandardProps = AnalyticsProps & {
  configPath: string;
  config?: Config;
};

export type AnalyticsProps = {
  analyticsProps: AsyncReturnType<typeof rudderTyperLibraryProperties>;
  anonymousId: string;
};

export type CLIArguments = {
  /** An optional path to a ruddertyper.yml (or directory with a ruddertyper.yml). **/
  config: string;
  /** An optional (hidden) flag for enabling Ink debug mode. */
  debug: boolean;
  /** Standard --version flag to print the version of this CLI. */
  version: boolean;
  /** Standard -v flag to print the version of this CLI. */
  v: boolean;
  /** Standard --help flag to print help on a command. */
  help: boolean;
  /** Standard -h flag to print help on a command. */
  h: boolean;
};

const commandDefaults: {
  builder: Record<string, yargs.Options>;
} = {
  builder: {
    config: {
      type: 'string',
      default: './',
    },
    version: {
      type: 'boolean',
      default: false,
    },
    v: {
      type: 'boolean',
      default: false,
    },
    help: {
      type: 'boolean',
      default: false,
    },
    h: {
      type: 'boolean',
      default: false,
    },
    debug: {
      type: 'boolean',
      default: false,
    },
  },
};

// The `.argv` below will boot a Yargs CLI.
yargs
  .command({
    ...commandDefaults,
    command: ['init', 'initialize', 'quickstart'],
    handler: toYargsHandler(Init, {}),
  })
  .command({
    ...commandDefaults,
    command: ['update', 'u', '*'],
    handler: toYargsHandler(Build, { production: false, update: true }, { validateDefault: true }),
  })
  .command({
    ...commandDefaults,
    command: ['build', 'b', 'd', 'dev', 'development'],
    handler: toYargsHandler(Build, { production: false, update: false }),
  })
  .command({
    ...commandDefaults,
    command: ['prod', 'p', 'production'],
    handler: toYargsHandler(Build, { production: true, update: false }),
  })
  .command({
    ...commandDefaults,
    command: ['token', 'tokens', 't'],
    handler: toYargsHandler(Token, {}),
  })
  .command({
    ...commandDefaults,
    command: 'version',
    handler: toYargsHandler(Version, {}),
  })
  .command({
    ...commandDefaults,
    command: 'help',
    handler: toYargsHandler(Help, {}),
  })
  .strict(true)
  // We override help + version ourselves.
  .help(false)
  .showHelpOnFail(false)
  .version(false).argv;

type DebugContextProps = {
  /** Whether or not debug mode is enabled. */
  debug: boolean;
};
export const DebugContext = createContext<DebugContextProps>({ debug: false });

function toYargsHandler<P = unknown>(
  Command: React.FC<StandardProps & P>,
  props: P,
  cliOptions?: { validateDefault?: boolean },
) {
  // Return a closure which yargs will execute if this command is run.
  return async (args: yargs.Arguments<CLIArguments>) => {
    let anonymousId = 'unknown';
    try {
      anonymousId = await getAnonymousId();
    } catch (error) {}

    try {
      // The '*' command is a catch-all. We want to fail the CLI if an unknown command is
      // supplied ('yarn rudder-typer footothebar'), instead of just running the default command.
      const isValidCommand =
        !cliOptions ||
        !cliOptions.validateDefault ||
        args._.length === 0 ||
        ['update', 'u'].includes(args._[0] as string);

      // Attempt to read a config, if one is available.
      const cfg = await getConfig(args.config);

      const analyticsProps = await rudderTyperLibraryProperties(args, cfg);

      // Figure out which component to render.
      let Component = Command;
      // Certain flags (--version, --help) will overide whatever command was provided.
      if (!!args.version || !!args.v || Command.displayName === Version.displayName) {
        // We override the --version flag from yargs with our own output. If it was supplied, print
        // the `version` component instead.
        Component = Version as typeof Command;
      } else if (
        !isValidCommand ||
        !!args.help ||
        !!args.h ||
        args._.includes('help') ||
        Command.displayName === Help.displayName
      ) {
        // Same goes for the --help flag.
        Component = Help as typeof Command;
      }

      // 🌟Render the command.
      try {
        const { waitUntilExit } = render(
          <DebugContext.Provider value={{ debug: args.debug }}>
            <ErrorBoundary
              anonymousId={anonymousId}
              analyticsProps={analyticsProps}
              debug={args.debug}
            >
              <Component
                configPath={args.config}
                config={cfg}
                anonymousId={anonymousId}
                analyticsProps={analyticsProps}
                {...props}
              />
            </ErrorBoundary>
          </DebugContext.Provider>,
          { debug: !!args.debug },
        );
        await waitUntilExit();
      } catch (err) {
        // Errors are handled/reported in ErrorBoundary.
        process.exitCode = 1;
      }

      // If this isn't a valid command, make sure we exit with a non-zero exit code.
      if (!isValidCommand) {
        process.exitCode = 1;
      }
    } catch (error) {
      // If an error was thrown in the command logic above (but outside of the ErrorBoundary in Component)
      // then render an ErrorBoundary.
      try {
        const { waitUntilExit } = render(
          <DebugContext.Provider value={{ debug: args.debug }}>
            <ErrorBoundary
              error={error as Error}
              anonymousId={anonymousId}
              analyticsProps={await rudderTyperLibraryProperties(args)}
              debug={args.debug}
            />
          </DebugContext.Provider>,
          {
            debug: !!args.debug,
          },
        );
        await waitUntilExit();
      } catch {
        // Errors are handled/reported in ErrorBoundary.
        process.exitCode = 1;
      }
    }
  };
}

/** Helper to fetch the name of the current yargs CLI command. */
function getCommand(args: yargs.Arguments<CLIArguments>) {
  return args._.length === 0 ? 'update' : args._.join(' ');
}

/**
 * Helper to generate the shared library properties shared by all analytics calls.
 */
async function rudderTyperLibraryProperties(
  args: yargs.Arguments<CLIArguments>,
  cfg: Config | undefined = undefined,
) {
  // In CI environments, or if there is no internet, we may not be able to execute the
  // the token script.
  let tokenMethod = undefined;
  try {
    tokenMethod = await getTokenMethod(cfg, args.config);
  } catch {}

  // Attempt to read the name of the Tracking Plan from a local `plan.json`.
  // If this fails, that's fine -- we'll still have the id from the config.
  let trackingPlanName = '';
  try {
    if (cfg && cfg.trackingPlans.length > 0) {
      const tp = await loadTrackingPlan(args.config, cfg.trackingPlans[0]);
      if (tp) {
        trackingPlanName = getTrackingPlanName(tp);
      }
    }
  } catch {}

  return {
    version,
    client: cfg && {
      language: cfg.client.language,
      sdk: cfg.client.sdk,
    },
    command: getCommand(args),
    is_ci: Boolean(process.env.CI),
    token_method: tokenMethod,
    tracking_plan:
      cfg && cfg.trackingPlans && cfg.trackingPlans.length > 0
        ? {
            name: trackingPlanName,
            id: cfg.trackingPlans[0].id,
            workspace_slug: cfg.trackingPlans[0].workspaceSlug,
          }
        : undefined,
  };
}

/**
 * We generate an anonymous ID that is unique per user, s.t. we can group analytics from
 * the same user together.
 */
async function getAnonymousId() {
  return await machineId(false);
}

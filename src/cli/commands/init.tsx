import React, { useState, useEffect, useContext } from 'react';
import { Text, Box, Color, useApp } from 'ink';
import Link from 'ink-link';
import SelectInput, { Item } from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Config, listTokens, getTokenMethod, setConfig, storeToken } from '../config';
import {
  validateToken,
  RudderAPI,
  fetchTrackingPlans,
  toTrackingPlanURL,
  parseTrackingPlanName,
} from '../api';
import { SDK, Language, Options, JavaScriptOptions } from '../../generators/options';
import figures from 'figures';
import * as fs from 'fs';
import { promisify } from 'util';
import { join, normalize } from 'path';
import { orderBy } from 'lodash';
import { Build } from './build';
import Fuse from 'fuse.js';
import { StandardProps, DebugContext } from '../index';
import { ErrorContext, WrappedError, wrapError } from './error';
import { APIError } from '../types';
import { getTrackingPlanName } from '../api/trackingplans';

const readir = promisify(fs.readdir);

type InitProps = StandardProps & {
  /**
   * Optional handler that is fired after the init wizard finishes building a new config.
   *
   * Defaults to running a build with the new config.
   */
  onDone?: (config: Config) => void;
};

enum Steps {
  Confirmation = 0,
  SDK = 1,
  Language = 2,
  APIToken = 3,
  TrackingPlan = 4,
  Path = 5,
  Summary = 6,
  Build = 7,
  Done = 8,
}

export const Init: React.FC<InitProps> = props => {
  const { configPath } = props;
  const [config, setConfig] = useState(props.config);
  const [step, setStep] = useState(Steps.Confirmation);
  const [sdk, setSDK] = useState(config ? config.client.sdk : SDK.WEB);
  const [language, setLanguage] = useState(config ? config.client.language : Language.JAVASCRIPT);
  const [path, setPath] = useState(
    config && config.trackingPlans.length > 0 ? config.trackingPlans[0].path : '',
  );
  const [tokenMetadata, setTokenMetadata] = useState({
    token: '',
    email: '',
    workspace: undefined as RudderAPI.Workspace | undefined,
  });
  const [trackingPlan, setTrackingPlan] = useState<RudderAPI.TrackingPlan>();

  const { exit } = useApp();
  useEffect(() => {
    if (!props.onDone && step === Steps.Done) {
      exit();
    }
  }, [step]);

  const onNext = () => setStep(step + 1);
  const onRestart = () => {
    setStep(Steps.SDK);
  };

  function withNextStep<Arg>(f?: (arg: Arg) => void) {
    return (arg: Arg) => {
      if (f) {
        f(arg);
      }
      setStep(step + 1);
    };
  }

  function onAcceptSummary(config: Config) {
    setConfig(config);
    onNext();
    if (props.onDone) {
      props.onDone(config);
    }
  }

  return (
    <Box
      minHeight={20}
      marginLeft={2}
      marginRight={2}
      marginTop={1}
      marginBottom={1}
      flexDirection="column"
    >
      {step === Steps.Confirmation && <ConfirmationPrompt onSubmit={onNext} />}
      {step === Steps.SDK && <SDKPrompt step={step} sdk={sdk} onSubmit={withNextStep(setSDK)} />}
      {step === Steps.Language && (
        <LanguagePrompt
          step={step}
          sdk={sdk}
          language={language}
          onSubmit={withNextStep(setLanguage)}
        />
      )}
      {step === Steps.APIToken && (
        <APITokenPrompt
          step={step}
          config={config}
          configPath={configPath}
          onSubmit={withNextStep(setTokenMetadata)}
        />
      )}
      {step === Steps.TrackingPlan && (
        <TrackingPlanPrompt
          step={step}
          token={tokenMetadata.token}
          email={tokenMetadata.email}
          trackingPlan={trackingPlan}
          onSubmit={withNextStep(setTrackingPlan)}
        />
      )}
      {step === Steps.Path && (
        <PathPrompt step={step} path={path} onSubmit={withNextStep(setPath)} />
      )}
      {step === Steps.Summary && (
        <SummaryPrompt
          step={step}
          sdk={sdk}
          language={language}
          path={path}
          token={tokenMetadata.token}
          workspace={tokenMetadata.workspace!}
          trackingPlan={trackingPlan!}
          onConfirm={onAcceptSummary}
          onRestart={onRestart}
        />
      )}
      {step === Steps.Build && !props.onDone && (
        <Build {...{ ...props, config }} production={false} update={true} />
      )}
      {/* TODO: step 8 where we show an example script showing how to import ruddertyper */}
    </Box>
  );
};

const Header: React.FC = () => {
  return (
    <Box flexDirection="column">
      <Box width={80} textWrap="wrap" marginBottom={4}>
        <Color white>
          RudderTyper is a tool for generating strongly-typed{' '}
          <Link url="https://www.rudderstack.com/">RudderStack</Link> analytics libraries from a
          Tracking Plan
        </Color>{' '}
        <Color grey>
          . To get started, {"you'll"} need a <Color yellow>ruddertyper.yml</Color>. The quickstart
          below will walk you through creating one.
        </Color>
      </Box>
    </Box>
  );
};

type ConfirmationPromptProps = {
  onSubmit: () => void;
};

/** A simple prompt to get users acquainted with the terminal-based select. */
const ConfirmationPrompt: React.FC<ConfirmationPromptProps> = ({ onSubmit }) => {
  const items = [{ label: 'Ok!', value: 'ok' }];

  const tips = ['Hit return to continue.'];

  return (
    <>
      <Header />
      <Step name="Ready?" tips={tips}>
        <SelectInput items={items} onSelect={onSubmit} />
      </Step>
    </>
  );
};

type SDKPromptProps = {
  step: number;
  sdk: SDK;
  onSubmit: (sdk: SDK) => void;
};

/** A prompt to identify which RudderStack SDK a user wants to use. */
const SDKPrompt: React.FC<SDKPromptProps> = ({ step, sdk, onSubmit }) => {
  const items: Item[] = [
    { label: 'Web (analytics.js)', value: SDK.WEB },
    { label: 'Node.js (analytics-node)', value: SDK.NODE },
    { label: 'iOS (analytics-ios)', value: SDK.IOS },
    { label: 'Android (analytics-android)', value: SDK.ANDROID },
  ];
  const initialIndex = items.findIndex(i => i.value === sdk);

  const onSelect = (item: Item) => {
    onSubmit(item.value as SDK);
  };

  const tips = [
    'Use your arrow keys to select.',
    'RudderTyper clients are strongly-typed wrappers around a RudderStack SDK.',
    <Text key="sdk-docs">
      To learn more about {"RudderStack's"} SDKs, see the{' '}
      <Link url="https://docs.rudderstack.com/stream-sources">documentation</Link>.
    </Text>,
  ];

  return (
    <Step name="Choose a SDK:" step={step} tips={tips}>
      <SelectInput items={items} initialIndex={initialIndex} onSelect={onSelect} />
    </Step>
  );
};

type LanguagePromptProps = {
  step: number;
  sdk: SDK;
  language: Language;
  onSubmit: (language: Language) => void;
};

/** A prompt to identify which RudderStack programming language a user wants to use. */
const LanguagePrompt: React.FC<LanguagePromptProps> = ({ step, sdk, language, onSubmit }) => {
  const items: Item[] = [
    { label: 'JavaScript', value: Language.JAVASCRIPT },
    { label: 'TypeScript', value: Language.TYPESCRIPT },
    { label: 'Objective-C', value: Language.OBJECTIVE_C },
    { label: 'Swift', value: Language.SWIFT },
    { label: 'Java', value: Language.JAVA },
  ].filter(item => {
    // Filter out items that aren't relevant, given the selected SDK.
    const supportedLanguages = {
      [SDK.WEB]: [Language.JAVASCRIPT, Language.TYPESCRIPT],
      [SDK.NODE]: [Language.JAVASCRIPT, Language.TYPESCRIPT],
      [SDK.IOS]: [Language.OBJECTIVE_C, Language.SWIFT],
      [SDK.ANDROID]: [Language.JAVA],
    };

    return supportedLanguages[sdk].includes(item.value);
  });
  const initialIndex = items.findIndex(i => i.value === language);

  const onSelect = (item: Item) => {
    onSubmit(item.value as Language);
  };

  return (
    <Step name="Choose a language:" step={step}>
      <SelectInput
        items={items}
        initialIndex={initialIndex != -1 ? initialIndex : 0}
        onSelect={onSelect}
      />
    </Step>
  );
};

type PathPromptProps = {
  step: number;
  path: string;
  onSubmit: (path: string) => void;
};

/** Helper to list and filter all directories under a given filesystem path. */
async function filterDirectories(path: string): Promise<string[]> {
  /** Helper to list all directories in a given path. */
  const listDirectories = async (path: string): Promise<string[]> => {
    try {
      const files = await readir(path, {
        withFileTypes: true,
      });
      const directoryBlocklist = ['node_modules'];
      return files
        .filter(f => f.isDirectory())
        .filter(f => !f.name.startsWith('.'))
        .filter(f => !directoryBlocklist.some(b => f.name.startsWith(b)))
        .map(f => join(path, f.name))
        .filter(f => normalize(f).startsWith(normalize(path).replace(/^\.\/?/, '')));
    } catch {
      // If we can't read this path, then return an empty list of sub-directories.
      return [];
    }
  };

  const isPathEmpty = ['', '.', './'].includes(path);
  const directories = new Set<string>();

  // First look for all directories in the same directory as the current query path.
  const parentPath = join(path, isPathEmpty || path.endsWith('/') ? '.' : '..');
  const parentDirectories = await listDirectories(parentPath);
  parentDirectories.forEach(f => directories.add(f));

  const queryPath = join(parentPath, path);
  // Next, if the current query IS a directory, then we want to prioritize results from inside that directory.
  if (directories.has(queryPath)) {
    const queryDirectories = await listDirectories(queryPath);
    queryDirectories.forEach(f => directories.add(f));
  }

  // Otherwise, show results from inside any other directories at the level of the current query path.
  for (const dirPath of parentDirectories) {
    if (directories.size >= 10) {
      break;
    }

    const otherDirectories = await listDirectories(dirPath);
    otherDirectories.forEach(f => directories.add(f));
  }

  // Now sort these directories by the query path.
  const fuse = new Fuse(
    [...directories].map(d => ({ name: d })),
    { keys: ['name'] },
  );
  return isPathEmpty ? [...directories] : fuse.search(path).map(d => d.name);
}

/** A prompt to identify where to store the new client on the user's filesystem. */
const PathPrompt: React.FC<PathPromptProps> = ({ step, path: initialPath, onSubmit }) => {
  const [path, setPath] = useState(initialPath);
  const [directories, setDirectories] = useState<string[]>([]);

  // Fetch a list of directories, filtering by the supplied path.
  useEffect(() => {
    (async () => {
      let directories: string[] = [];
      try {
        directories = await filterDirectories(path);
      } catch (err) {
        console.error(err);
      }

      setDirectories(directories);
    })();
  }, [path]);

  const tips = [
    'The generated client will be stored in this directory.',
    'Start typing to filter existing directories. Hit return to submit.',
    'Directories will be automatically created, if needed.',
  ];

  const onSubmitPath = () => {
    onSubmit(normalize(path));
  };

  const isNewDirectory =
    !['', '.', './'].includes(normalize(path)) && !directories.includes(normalize(path));
  const directoryRows: (string | JSX.Element)[] = isNewDirectory
    ? [
        <Text key="new-directory">
          {path} <Color blue>(new)</Color>
        </Text>,
      ]
    : [];
  directoryRows.push(...directories.slice(0, 10 - directoryRows.length));

  return (
    <Step name="Enter a directory:" step={step} tips={tips}>
      <Box>
        <Text>{figures.pointer}</Text>{' '}
        <TextInput value={path} showCursor={true} onChange={setPath} onSubmit={onSubmitPath} />
      </Box>
      <Box height={10} marginLeft={2} flexDirection="column">
        {directoryRows.map((d, i) => (
          <Color key={i} grey>
            {d}
          </Color>
        ))}
      </Box>
    </Step>
  );
};

type APITokenPromptProps = {
  step: number;
  config?: Config;
  configPath: string;
  onSubmit: (tokenMetadata: {
    token: string;
    email: string;
    workspace: RudderAPI.Workspace;
  }) => void;
};

/** A prompt to walk a user through getting a new RudderStack API token. */
const APITokenPrompt: React.FC<APITokenPromptProps> = ({ step, config, configPath, onSubmit }) => {
  const [state, setState] = useState({
    token: '',
    email: '',
    canBeSet: true,
    workspace: undefined as RudderAPI.Workspace | undefined,
    isLoading: true,
    isInvalid: false,
    foundCachedToken: false,
    tokenSubmitted: false,
    tokenCursor: true,
  });
  const { handleFatalError } = useContext(ErrorContext);

  useEffect(() => {
    async function effect() {
      try {
        const tokens = await listTokens(config, configPath);
        const method = await getTokenMethod(config, configPath);
        const token = method === tokens.script.method ? tokens.script : tokens.file;

        setState({
          ...state,
          token: token.isValidToken ? token.token! : '',
          email: token.email ? token.email! : '',
          isInvalid: false,
          workspace: token.workspace || state.workspace,
          foundCachedToken: token.isValidToken,
          isLoading: false,
          // If the user already has a ruddertyper.yml with a valid token script,
          // then let the user know that they can't overwrite it.
          canBeSet: method !== tokens.script.method,
        });
      } catch (error) {
        handleFatalError(error as WrappedError);
      }
    }

    effect();
  }, []);

  // Fired after a user enters a token.
  const onConfirm = async () => {
    // Validate whether the entered token is a valid RudderStack API token.
    setState({
      ...state,
      isLoading: true,
    });

    const result = await validateToken(state.token, state.email);
    if (result.isValid) {
      try {
        await storeToken(state.token, state.email);
      } catch (error) {
        const err = error as APIError;
        handleFatalError(
          wrapError(
            'Unable to save token to ~/.ruddertyper',
            err,
            `Failed due to an ${err.code} error (${err.errno}).`,
          ),
        );
        return;
      }

      onSubmit({ token: state.token, email: state.email, workspace: result.workspace! });
    } else {
      setState({
        ...state,
        token: '',
        email: '',
        workspace: undefined,
        isInvalid: true,
        isLoading: false,
        tokenSubmitted: false,
      });
    }
  };

  // Fired if a user confirms a cached token.
  const onConfirmCachedToken = async (item: Item) => {
    if (item.value === 'no') {
      // Clear the selected token so they can enter their own.
      setState({
        ...state,
        foundCachedToken: false,
        token: '',
        email: '',
        workspace: undefined,
        isInvalid: false,
      });
    } else {
      // Otherwise submit this token.
      await onConfirm();
    }
  };

  const setTokenSubmitted = () => {
    setState({
      ...state,
      tokenSubmitted: true,
    });
  };
  const setToken = (token: string) => {
    setState({
      ...state,
      token,
    });
  };

  const setEmail = (email: string) => {
    setState({
      ...state,
      email,
    });
  };

  const tips = [
    'An API token is used to download Tracking Plans from Rudder.',
    <Text key="api-token-docs">
      Documentation on generating an API token can be found{' '}
      <Link url="https://www.rudderstack.com/docs/dashboard-guides/personal-access-token/">
        here
      </Link>
      .
    </Text>,
  ];

  if (state.foundCachedToken) {
    tips.push(
      <Color yellow>
        A cached token for {state.workspace!.name} is already in your environment.
      </Color>,
    );
  }

  return (
    <div>
      <Step name="Enter a Rudder API token:" step={step} isLoading={state.isLoading} tips={tips}>
        {/* We found a token from a ruddertyper.yml token script. To let the user change token
         * in this init command, we'd have to remove their token script. Instead, just tell
         * the user this and don't let them change their token. */}
        {!state.canBeSet && (
          <SelectInput items={[{ label: 'Ok!', value: 'ok' }]} onSelect={onConfirm} />
        )}
        {/* We found a token in a ~/.ruddertyper. Confirm that the user wants to use this token
         * before continuing. */}
        {state.canBeSet && state.foundCachedToken && (
          <SelectInput
            items={[
              { label: 'Use this token', value: 'yes' },
              { label: 'No, provide a different token.', value: 'no' },
            ]}
            onSelect={onConfirmCachedToken}
          />
        )}
        {/* We didn't find a token anywhere that they wanted to use, so just prompt the user for one. */}
        {state.canBeSet && !state.foundCachedToken && (
          <Box flexDirection="column">
            <Box>
              <Text>{figures.pointer}</Text>{' '}
              <TextInput
                value={state.token}
                // See: https://github.com/vadimdemedes/ink-text-input/issues/41
                onChange={setToken}
                showCursor={true}
                focus={!state.tokenSubmitted}
                onSubmit={setTokenSubmitted}
                mask="*"
              />
            </Box>
            {state.isInvalid && (
              <Box textWrap="wrap" marginLeft={2}>
                <Color red>{figures.cross} Invalid Rudder API token.</Color>
              </Box>
            )}
          </Box>
        )}
      </Step>
      {state.tokenSubmitted && (
        <Step name="Enter your Email Id" isLoading={state.isLoading}>
          <Box flexDirection="column">
            <Box>
              <Text>{figures.pointer}</Text>{' '}
              <TextInput
                value={state.email}
                onChange={setEmail}
                showCursor={true}
                onSubmit={onConfirm}
              />
            </Box>
          </Box>
        </Step>
      )}
    </div>
  );
};

type TrackingPlanPromptProps = {
  step: number;
  token: string;
  email: string;
  trackingPlan?: RudderAPI.TrackingPlan;
  onSubmit: (trackingPlan: RudderAPI.TrackingPlan) => void;
};

/** A prompt to identify which RudderStack Tracking Plan a user wants to use. */
// Needs an empty state — allows users to create a Tracking Plan, then a reload button to refetch
const TrackingPlanPrompt: React.FC<TrackingPlanPromptProps> = ({
  step,
  token,
  email,
  trackingPlan,
  onSubmit,
}) => {
  const [trackingPlans, setTrackingPlans] = useState<RudderAPI.TrackingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { handleFatalError } = useContext(ErrorContext);

  async function loadTrackingPlans() {
    setIsLoading(true);
    try {
      setTrackingPlans(await fetchTrackingPlans({ token, email }));
      setIsLoading(false);
    } catch (error) {
      const err = error as APIError;
      if (err.statusCode === 403) {
        return handleFatalError(
          wrapError(
            'Failed to authenticate with the RudderStack API',
            err,
            'You may be using a malformed/invalid token or a legacy personal access token',
          ),
        );
      } else {
        return handleFatalError(
          wrapError(
            'Unable to fetch Tracking Plans',
            err,
            'Check your internet connectivity and try again',
          ),
        );
      }
    }
  }

  useEffect(() => {
    loadTrackingPlans();
  }, []);

  const onSelect = (item: Item) => {
    const trackingPlan = trackingPlans.find(tp => getTrackingPlanName(tp) === item.value)!;
    onSubmit(trackingPlan);
  };

  // Sort the Tracking Plan alphabetically by display name.
  const choices = orderBy(
    trackingPlans.map(tp => ({
      label: getTrackingPlanName(tp),
      value: getTrackingPlanName(tp),
    })),
    'label',

    'asc',
  );
  let initialIndex = choices.findIndex(
    c => !!trackingPlan && c.value === getTrackingPlanName(trackingPlan),
  );
  initialIndex = initialIndex === -1 ? 0 : initialIndex;

  const tips = [
    'RudderTyper will generate a client from this Tracking Plan.',
    <Text key="plan-path">
      This Tracking Plan is saved locally in a <Color yellow>plan.json</Color> file.
    </Text>,
  ];

  return (
    <Step name="Tracking Plan:" tips={tips} step={step} isLoading={isLoading}>
      {trackingPlans.length > 0 && (
        <SelectInput items={choices} onSelect={onSelect} initialIndex={initialIndex} limit={10} />
      )}
      {trackingPlans.length === 0 && (
        <Step name="Your workspace does not have any Tracking Plans. Add one first, before continuing.">
          <SelectInput
            items={[{ label: 'Refresh', value: 'refresh' }]}
            onSelect={loadTrackingPlans}
          />
        </Step>
      )}
    </Step>
  );
};

type SummaryPromptProps = {
  step: number;
  sdk: SDK;
  language: Language;
  path: string;
  token: string;
  workspace: RudderAPI.Workspace;
  trackingPlan: RudderAPI.TrackingPlan;
  onConfirm: (config: Config) => void;
  onRestart: () => void;
};

/** A prompt to confirm all of the configured settings with the user. */
const SummaryPrompt: React.FC<SummaryPromptProps> = ({
  step,
  sdk,
  language,
  path,
  token,
  workspace,
  trackingPlan,
  onConfirm,
  onRestart,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { handleFatalError } = useContext(ErrorContext);

  const onSelect = async (item: Item) => {
    if (item.value === 'lgtm') {
      // Write the updated ruddertyper.yml config.
      setIsLoading(true);

      let client = ({
        sdk,
        language,
      } as unknown) as Options;
      // Default to ES5 syntax for analytics-node in JS, since node doesn't support things
      // like ES6 modules. TypeScript transpiles for you, so we don't need it there.
      // See https://node.green
      if (sdk === SDK.NODE && language === Language.JAVASCRIPT) {
        client = client as JavaScriptOptions;
        client.moduleTarget = 'CommonJS';
        client.scriptTarget = 'ES5';
      }
      const tp = trackingPlan.creationType
        ? { id: trackingPlan.id, workspaceSlug: trackingPlan.workspaceId, APIVersion: 'v2' }
        : parseTrackingPlanName(trackingPlan.name);
      try {
        const config: Config = {
          client,
          trackingPlans: [
            {
              name: getTrackingPlanName(trackingPlan),
              id: tp.id,
              workspaceSlug: tp.workspaceSlug,
              path,
              APIVersion: tp.APIVersion,
            },
          ],
        };
        await setConfig(config);
        setIsLoading(false);
        onConfirm(config);
      } catch (error) {
        const err = error as APIError;
        handleFatalError(
          wrapError(
            'Unable to write ruddertyper.yml',
            err,
            `Failed due to an ${err.code} error (${err.errno}).`,
          ),
        );
        return;
      }
    } else {
      onRestart();
    }
  };

  const summaryRows = [
    { label: 'SDK', value: sdk },
    { label: 'Language', value: language },
    { label: 'Directory', value: path },
    { label: 'API Token', value: `${workspace.name} (${token.slice(0, 10)}...)` },
    { label: 'API Version', value: trackingPlan.creationType ? 'v2' : 'v1' },
    {
      label: 'Tracking Plan',
      value: <Link url={toTrackingPlanURL(trackingPlan)}>{getTrackingPlanName(trackingPlan)}</Link>,
    },
  ];

  const summary = (
    <Box flexDirection="column">
      {summaryRows.map(r => (
        <Box key={r.label}>
          <Box width={20}>
            <Color grey>{r.label}:</Color>
          </Box>
          <Color yellow>{r.value}</Color>
        </Box>
      ))}
    </Box>
  );

  return (
    <Step name="Summary:" step={step} description={summary} isLoading={isLoading}>
      <SelectInput
        items={[
          { label: 'Looks good!', value: 'lgtm' },
          { label: 'Edit', value: 'edit' },
        ]}
        onSelect={onSelect}
      />
    </Step>
  );
};

type StepProps = {
  name: string;
  step?: number;
  isLoading?: boolean;
  description?: JSX.Element;
  tips?: (string | JSX.Element)[];
};

const Step: React.FC<StepProps> = ({
  step,
  name,
  isLoading = false,
  description,
  tips,
  children,
}) => {
  const { debug } = useContext(DebugContext);

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" width={80} justifyContent="space-between">
        <Box>
          <Color white>{name}</Color>
        </Box>
        {step && (
          <Box>
            <Color yellow>[{step}/6]</Color>
          </Box>
        )}
      </Box>
      <Box marginLeft={1} flexDirection="column">
        {tips &&
          tips.map((t, i) => (
            <Color grey key={i}>
              {figures.arrowRight} {t}
            </Color>
          ))}
        {description}
        <Box marginTop={1} flexDirection="column">
          {isLoading && (
            <Color grey>
              {!debug && (
                <>
                  <Spinner type="dots" />{' '}
                </>
              )}
              Loading...
            </Color>
          )}
          {!isLoading && children}
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Help layout inspired by Zeit's Now CLI.
 *   https://zeit.co
 */
import React, { useEffect } from 'react';
import { Box, Color, Text, useApp } from 'ink';
import Link from 'ink-link';
import { StandardProps } from '../index';

export const Help: React.FC<StandardProps> = () => {
  const { exit } = useApp();
  useEffect(() => {
    exit();
  }, []);

  return (
    <Box marginLeft={2} flexDirection="column">
      <Box marginBottom={2} textWrap="wrap">
        <Color grey>
          RudderTyper is a tool for generating strongly-typed{' '}
          <Link url="https://rudderstack.com">RudderStack</Link> analytics libraries based on your
          pre-defined Tracking Plan spec.
          {'\n\n'}
        </Color>
      </Box>
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Color grey>$</Color> <Color>rudder-typer</Color> <Color grey>[command, options]</Color>
        </Box>
        <HelpSection name="Commands">
          <HelpRow
            name="init"
            description={
              <Text>
                Quickstart wizard to create a <Color yellow>ruddertyper.yml</Color>
              </Text>
            }
          />
          <HelpRow
            name="update"
            isDefault={true}
            linesNeeded={2}
            description={
              <Text>
                Syncs <Color yellow>plan.json</Color> with RudderStack, then generates a{' '}
                <Color yellow>development</Color> client.
              </Text>
            }
          />
          <HelpRow
            name="dev"
            description={
              <Text>
                Generates a <Color yellow>development</Color> client from{' '}
                <Color yellow>plan.json</Color>
              </Text>
            }
          />
          <HelpRow
            name="prod"
            description={
              <Text>
                Generates a <Color yellow>production</Color> client from{' '}
                <Color yellow>plan.json</Color>
              </Text>
            }
          />
          <HelpRow
            name="token"
            description="Prints the local RudderStack API token configuration"
          />
        </HelpSection>
        <HelpSection name="Options">
          <HelpRow name="-h, --help" description="Prints this help message" />
          <HelpRow name="-v, --version" description="Prints the CLI version" />
          <HelpRow
            name="-c, --config"
            description={
              <Text>
                Path to a <Color yellow>ruddertyper.yml</Color> file
              </Text>
            }
          />
          {/* NOTE: we only show the --debug flag when developing locally on RudderTyper. */}
          <HelpRow
            name="    --debug"
            isHidden={process.env.NODE_ENV === 'production'}
            description="Enables Ink debug mode"
          />
        </HelpSection>
        <HelpSection name="Examples">
          <ExampleRow
            description="Initialize RudderTyper in a new repo"
            command="rudder-typer init"
          />
          <ExampleRow description="Pull your latest Tracking Plan changes" command="rudder-typer" />
          <ExampleRow
            description="Build a client without runtime validation"
            command="rudder-typer prod"
          />
          <ExampleRow
            description="Use a config in another directory"
            command="rudder-typer --config ../ruddertyper.yml"
          />
        </HelpSection>
      </Box>
    </Box>
  );
};

type HelpSectionProps = {
  name: string;
};

const HelpSection: React.FC<HelpSectionProps> = ({ name, children }) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Color grey>{name}:</Color>
      <Box flexDirection="column" marginLeft={2}>
        {children}
      </Box>
    </Box>
  );
};

type HelpRowProps = {
  name: string;
  isDefault?: boolean;
  description: string | JSX.Element;
  linesNeeded?: number;
  isHidden?: boolean;
};

const HelpRow: React.FC<HelpRowProps> = ({
  name,
  description,
  isDefault,
  linesNeeded,
  isHidden,
}) => {
  if (!!isHidden) {
    return null;
  }

  return (
    <Box height={linesNeeded || 1}>
      <Box width="20%">{name}</Box>
      <Box width="65%" textWrap="wrap">
        {description}
      </Box>
      <Box width="15%">{!!isDefault ? <Color blue>(default)</Color> : ''}</Box>
    </Box>
  );
};

type ExampleRowProps = {
  description: string;
  command: string;
};

const ExampleRow: React.FC<ExampleRowProps> = ({ description, command }) => {
  return (
    <Box flexDirection="column">
      {description}
      <Box marginLeft={2}>
        <Color redBright>$ {command}</Color>
      </Box>
    </Box>
  );
};

Help.displayName = 'Help';

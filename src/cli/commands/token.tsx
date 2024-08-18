import React, { useState, useEffect, useContext } from 'react';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { listTokens, ListTokensOutput, getTokenMethod, TokenMetadata } from '../config/index.js';
import { StandardProps } from '../index.js';
import { ErrorContext } from './error.js';

export const Token: React.FC<StandardProps> = (props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [method, setMethod] = useState<string | undefined>();
  const [tokens, setTokens] = useState<ListTokensOutput | undefined>();
  const { handleFatalError } = useContext(ErrorContext);
  const { exit } = useApp();

  useEffect(() => {
    async function effect() {
      setMethod(await getTokenMethod(props.config, props.configPath));
      setTokens(await listTokens(props.config, props.configPath));
      setIsLoading(false);
      exit();
    }

    effect().catch(handleFatalError);
  }, []);

  if (isLoading) {
    return (
      <Box marginLeft={2} marginTop={1} marginBottom={1}>
        <Spinner type="dots" />
        <Text color="grey">Loading...</Text>
      </Box>
    );
  }

  return (
    <Box marginTop={1} marginBottom={1} marginLeft={2} flexDirection="column">
      <Box flexDirection="column">
        <TokenRow name="scripts.token" tokenMetadata={tokens && tokens.script} method={method} />
        <TokenRow name="~/.ruddertyper" tokenMetadata={tokens && tokens.file} method={method} />
      </Box>
    </Box>
  );
};

type TokenRowProps = {
  tokenMetadata?: TokenMetadata;
  method?: string;
  name: string;
};

const TokenRow: React.FC<TokenRowProps> = ({ tokenMetadata, method, name }) => {
  const isSelected = tokenMetadata && method === tokenMetadata.method;

  return (
    <Box flexDirection="row">
      <Box width={20}>
        <Text color={isSelected ? 'green' : 'grey'}>{name}:</Text>
      </Box>
      <Box width={15}>
        <Text color={isSelected ? 'green' : 'grey'}>
          {tokenMetadata && tokenMetadata.token
            ? `${tokenMetadata.token.slice(0, 10)}...`
            : '(None)'}
        </Text>
      </Box>
      {tokenMetadata && !!tokenMetadata.token && !tokenMetadata.isValidToken ? (
        <Box width={10}>
          <Text color="red">(invalid token)</Text>
        </Box>
      ) : (
        <Box width={10}>
          <Text color={isSelected ? 'green' : 'grey'}>
            {tokenMetadata && tokenMetadata.workspace ? tokenMetadata.workspace.name : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
};

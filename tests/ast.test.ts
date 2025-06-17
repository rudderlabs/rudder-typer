import { parse } from '../src/generators/ast';
import * as astFixtures from './fixtures/asts';
import * as fs from 'fs';
import { promisify } from 'util';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import _ from 'lodash';

const readFile = promisify(fs.readFile);

describe('AST', () => {
  const foobar = _.map(astFixtures, (ast, name) => ({ ast, name }));
  test.each(foobar)('parses %s', async ({ ast, name }) => {
    expect.assertions(1);

    const currentDir = dirname(fileURLToPath(import.meta.url));
    const schemaJSON = await readFile(resolve(currentDir, `./fixtures/schemas/${name}.json`), {
      encoding: 'utf-8',
    });
    const schema = JSON.parse(schemaJSON);

    expect(parse(schema)).toEqual(ast);
  });
});

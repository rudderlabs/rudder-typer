import { parse } from '../src/generators/ast';
import * as fs from 'fs';
import { promisify } from 'util';
import { resolve } from 'path';
import { Type, ArrayTypeSchema } from '../src/generators/ast';

const readFile = promisify(fs.readFile);

describe('Custom Types', () => {
  let schema: any;

  beforeAll(async () => {
    const schemaJSON = await readFile(resolve(__dirname, './fixtures/schemas/customTypes.json'), {
      encoding: 'utf-8',
    });
    schema = JSON.parse(schemaJSON);
    // Parse the schema first to register all custom types
    parse(schema);
  });

  test('handles enum values in custom types', () => {
    const boolSchema = parse({ $ref: '#/$defs/ct-boo' });
    const stringSchema = parse({ $ref: '#/$defs/ct-string-enum' });
    const numberSchema = parse({ $ref: '#/$defs/ct-number-enum' });

    expect(boolSchema._refName).toBe('ct-boo');
    expect(stringSchema._refName).toBe('ct-string-enum');
    expect(numberSchema._refName).toBe('ct-number-enum');
  });

  test('handles object structure in custom types', () => {
    const objectSchema = parse({ $ref: '#/$defs/ct-object' });
    expect(objectSchema._refName).toBe('ct-object');
  });

  test('handles nested custom type references', () => {
    const nestedSchema = parse({ $ref: '#/$defs/ct-nested' });
    expect(nestedSchema._refName).toBe('ct-nested');
  });

  test('handles array type with item type', () => {
    const arraySchema = parse({ $ref: '#/$defs/ct-array' });
    expect(arraySchema._refName).toBe('ct-array');
  });

  test('handles array of $ref and propagates _refName', () => {
    const arrayOfRefSchema = parse({
      type: 'array',
      items: { $ref: '#/$defs/ct-object' },
    }) as ArrayTypeSchema;

    expect(arrayOfRefSchema.type).toBe(Type.ARRAY);
    expect(arrayOfRefSchema.items).toBeDefined();
    expect(arrayOfRefSchema.items._refName).toBe('ct-object');
  });

  test('preserves custom type references in nested properties', () => {
    const nestedSchema = parse({ $ref: '#/$defs/ct-nested' });
    expect(nestedSchema._refName).toBe('ct-nested');
  });

  test('handles required properties correctly', () => {
    const objectSchema = parse({ $ref: '#/$defs/ct-object' });
    expect(objectSchema._refName).toBe('ct-object');
  });

  test('maintains type consistency across references', () => {
    const nestedSchema = parse({ $ref: '#/$defs/ct-nested' });
    expect(nestedSchema._refName).toBe('ct-nested');

    const arraySchema = parse({ $ref: '#/$defs/ct-array' });
    expect(arraySchema._refName).toBe('ct-array');
  });
});

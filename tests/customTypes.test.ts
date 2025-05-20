import { parse, extractCustomTypes } from '../src/generators/ast';
import * as fs from 'fs';
import { promisify } from 'util';
import { resolve } from 'path';
import { customTypes } from './fixtures/asts';
import { Type } from '../src/generators/ast';

const readFile = promisify(fs.readFile);

describe('Custom Types', () => {
  let schema: any;
  let definedTypes: any;

  beforeEach(async () => {
    const schemaJSON = await readFile(resolve(__dirname, './fixtures/schemas/customTypes.json'), {
      encoding: 'utf-8',
    });
    schema = JSON.parse(schemaJSON);
    definedTypes = extractCustomTypes(schema, 'Custom Types Fixture');
  });

  test('parses custom types schema', async () => {
    expect.assertions(1);
    const ast = parse(schema);
    expect(ast).toEqual(customTypes);
  });

  test('extracts all custom types', () => {
    expect(Object.keys(definedTypes)).toEqual([
      '#/$defs/ct-boo',
      'ct-boo',
      '#/$defs/ct-string-enum',
      'ct-string-enum',
      '#/$defs/ct-number-enum',
      'ct-number-enum',
      '#/$defs/ct-object',
      'ct-object',
      '#/$defs/ct-array',
      'ct-array',
      '#/$defs/ct-nested',
      'ct-nested',
    ]);
  });

  test('preserves enum values in custom types', () => {
    const boolEnum = definedTypes['ct-boo'];
    const stringEnum = definedTypes['ct-string-enum'];
    const numberEnum = definedTypes['ct-number-enum'];

    expect(boolEnum.enum).toEqual([true, false]);
    expect(stringEnum.enum).toEqual(['type1', 'type2', 'type3']);
    expect(numberEnum.enum).toEqual([1, 2, 3]);
  });

  test('preserves object structure in custom types', () => {
    const objectType = definedTypes['ct-object'];

    expect(objectType.type).toBe(Type.OBJECT);
    expect(objectType.properties).toHaveLength(2);
    expect(objectType.properties[0]).toEqual(
      expect.objectContaining({
        name: 'name',
        type: Type.STRING,
        isRequired: true,
      }),
    );
    expect(objectType.properties[1]).toEqual(
      expect.objectContaining({
        name: 'value',
        type: Type.NUMBER,
      }),
    );
  });

  test('handles nested custom type references', () => {
    const nestedType = definedTypes['ct-nested'];

    expect(nestedType.type).toBe(Type.OBJECT);
    expect(nestedType.properties).toHaveLength(2);

    // Check obj property references ct-object
    const objProp = nestedType.properties[0];
    expect(objProp.__refName).toBe('ct-object');

    // Check enum property references ct-string-enum
    const enumProp = nestedType.properties[1];
    expect(enumProp.__refName).toBe('ct-string-enum');
  });

  test('preserves array type with item type', () => {
    const arrayType = definedTypes['ct-array'];

    expect(arrayType.type).toBe(Type.ARRAY);
    expect(arrayType.items).toEqual(
      expect.objectContaining({
        type: Type.STRING,
      }),
    );
  });

  test('adds descriptions to custom types', () => {
    const expectedDescription = 'Custom type for Custom Types Fixture';

    Object.values(definedTypes).forEach((type: any) => {
      if (!type.$ref) {
        expect(type.description).toBe(expectedDescription);
      }
    });
  });

  test('preserves custom type references in nested properties', () => {
    const nestedType = definedTypes['ct-nested'];
    const objProp = nestedType.properties[0];

    // Check that the referenced object type matches the original definition
    expect(objProp.properties).toEqual(definedTypes['ct-object'].properties);

    // Check that the referenced enum type matches the original definition
    const enumProp = nestedType.properties[1];
    expect(enumProp.enum).toEqual(definedTypes['ct-string-enum'].enum);
  });

  test('handles required properties correctly', () => {
    const objectType = definedTypes['ct-object'];

    // Check required property
    const nameProperty = objectType.properties.find((p: any) => p.name === 'name');
    expect(nameProperty.isRequired).toBe(true);

    // Check optional property
    const valueProperty = objectType.properties.find((p: any) => p.name === 'value');
    expect(valueProperty.isRequired).toBeFalsy();
  });

  test('maintains type consistency across references', () => {
    const nestedType = definedTypes['ct-nested'];
    const objProp = nestedType.properties[0];
    const enumProp = nestedType.properties[1];

    expect(objProp.type).toBe(Type.OBJECT);
    expect(enumProp.type).toBe(Type.STRING);

    const arrayType = definedTypes['ct-array'];
    expect(arrayType.items.type).toBe(Type.STRING);
  });
});

import { parse } from '../src/generators/ast';
import * as fs from 'fs';
import { promisify } from 'util';
import { resolve } from 'path';
import {
  Type,
  PrimitiveTypeSchema,
  ObjectTypeSchema,
  ArrayTypeSchema,
} from '../src/generators/ast';

const readFile = promisify(fs.readFile);

describe('Custom Types', () => {
  let schema: any;

  beforeEach(async () => {
    const schemaJSON = await readFile(resolve(__dirname, './fixtures/schemas/customTypes.json'), {
      encoding: 'utf-8',
    });
    schema = JSON.parse(schemaJSON);
    // Parse the schema first to register all custom types
    parse(schema);
  });

  test('handles enum values in custom types', () => {
    const boolSchema = parse({ $ref: '#/$defs/ct-boo' }) as PrimitiveTypeSchema;
    const stringSchema = parse({ $ref: '#/$defs/ct-string-enum' }) as PrimitiveTypeSchema;
    const numberSchema = parse({ $ref: '#/$defs/ct-number-enum' }) as PrimitiveTypeSchema;

    expect(boolSchema.enum).toEqual([true, false]);
    expect(stringSchema.enum).toEqual(['type1', 'type2', 'type3']);
    expect(numberSchema.enum).toEqual([1, 2, 3]);
  });

  test('handles object structure in custom types', () => {
    const objectSchema = parse({ $ref: '#/$defs/ct-object' }) as ObjectTypeSchema;

    expect(objectSchema.type).toBe(Type.OBJECT);
    expect(objectSchema.properties).toHaveLength(2);
    expect(objectSchema.properties[0]).toEqual(
      expect.objectContaining({
        name: 'name',
        type: Type.STRING,
        isRequired: true,
      }),
    );
    expect(objectSchema.properties[1]).toEqual(
      expect.objectContaining({
        name: 'value',
        type: Type.NUMBER,
      }),
    );
  });

  test('handles nested custom type references', () => {
    const nestedSchema = parse({ $ref: '#/$defs/ct-nested' }) as ObjectTypeSchema;

    expect(nestedSchema.type).toBe(Type.OBJECT);
    expect(nestedSchema.properties).toHaveLength(2);

    // Check obj property references ct-object
    const objProp = nestedSchema.properties[0];
    expect(objProp._refName).toBe('ct-object');

    // Check enum property references ct-string-enum
    const enumProp = nestedSchema.properties[1];
    expect(enumProp._refName).toBe('ct-string-enum');
  });

  test('handles array type with item type', () => {
    const arraySchema = parse({ $ref: '#/$defs/ct-array' }) as ArrayTypeSchema;

    expect(arraySchema.type).toBe(Type.ARRAY);
    expect(arraySchema.items).toEqual(
      expect.objectContaining({
        type: Type.STRING,
      }),
    );
  });

  test('preserves custom type references in nested properties', () => {
    const nestedSchema = parse({ $ref: '#/$defs/ct-nested' }) as ObjectTypeSchema;
    const objProp = nestedSchema.properties[0] as ObjectTypeSchema;
    const objSchema = parse({ $ref: '#/$defs/ct-object' }) as ObjectTypeSchema;

    // Check that the referenced object type matches the original definition
    expect(objProp.properties).toEqual(objSchema.properties);

    // Check that the referenced enum type matches the original definition
    const enumProp = nestedSchema.properties[1] as PrimitiveTypeSchema;
    const enumSchema = parse({ $ref: '#/$defs/ct-string-enum' }) as PrimitiveTypeSchema;
    expect(enumProp.enum).toEqual(enumSchema.enum);
  });

  test('handles required properties correctly', () => {
    const objectSchema = parse({ $ref: '#/$defs/ct-object' }) as ObjectTypeSchema;

    // Check required property
    const nameProperty = objectSchema.properties.find((p) => p.name === 'name');
    expect(nameProperty?.isRequired).toBe(true);

    // Check optional property
    const valueProperty = objectSchema.properties.find((p) => p.name === 'value');
    expect(valueProperty?.isRequired).toBeFalsy();
  });

  test('maintains type consistency across references', () => {
    const nestedSchema = parse({ $ref: '#/$defs/ct-nested' }) as ObjectTypeSchema;
    const objProp = nestedSchema.properties[0] as ObjectTypeSchema;
    const enumProp = nestedSchema.properties[1] as PrimitiveTypeSchema;

    expect(objProp.type).toBe(Type.OBJECT);
    expect(enumProp.type).toBe(Type.STRING);

    const arraySchema = parse({ $ref: '#/$defs/ct-array' }) as ArrayTypeSchema;
    expect(arraySchema.items.type).toBe(Type.STRING);
  });
});

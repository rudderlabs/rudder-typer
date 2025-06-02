import { Schema, Type } from '../../src/generators/ast';

export const basicTypes: Schema = {
  name: 'Types Fixture',
  description: 'This fixture validates generation for the various JSON Schema types.',
  type: Type.OBJECT,
  properties: [
    {
      name: 'string',
      type: Type.STRING,
    },
    {
      name: 'integer',
      type: Type.INTEGER,
    },
    {
      name: 'number',
      type: Type.NUMBER,
    },
    {
      name: 'boolean',
      type: Type.BOOLEAN,
    },
    {
      name: 'any',
      type: Type.ANY,
      isNullable: true,
    },
    {
      name: 'array',
      type: Type.ARRAY,
      items: {
        type: Type.ANY,
      },
    },
    {
      name: 'object',
      type: Type.OBJECT,
      properties: [],
    },
    {
      name: 'null',
      type: Type.ANY,
      isNullable: true,
      enum: [null],
    },
  ],
};

export const enums: Schema = {
  name: 'Enums Fixture',
  description: 'This fixture validates generation for JSON Schema enums.',
  type: Type.OBJECT,
  properties: [
    {
      name: 'string-enum',
      type: Type.ANY,
      enum: ['boggs', 'rob', 'anastassia', 'evan', 'marc', 'nick'],
    },
    {
      name: 'number-enum',
      type: Type.ANY,
      enum: [8997, 8998, 8999],
    },
    {
      name: 'typed-enum',
      type: Type.STRING,
      enum: ['personas', 'protocols', 'connections', '<redacted>'],
    },
    {
      name: 'typed-union-enum',
      type: Type.UNION,
      types: [
        {
          type: Type.STRING,
          enum: ['yes', 'no', true, false],
        },
        {
          type: Type.BOOLEAN,
          enum: ['yes', 'no', true, false],
        },
      ],
      enum: ['yes', 'no', true, false],
    },
  ],
};

export const nested: Schema = {
  name: 'Nested Fixture',
  description:
    'This fixture validates generation for objects nested within other objects or arrays.',
  type: Type.OBJECT,
  properties: [
    {
      name: 'nested-object',
      type: Type.OBJECT,
      properties: [
        {
          name: 'name',
          type: Type.STRING,
        },
        {
          name: 'address',
          isNullable: true,
          type: Type.ANY,
        },
      ],
    },
    {
      name: 'nested-array',
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: [
          {
            name: 'name',
            type: Type.STRING,
          },
          {
            name: 'address',
            isNullable: true,
            type: Type.ANY,
          },
        ],
      },
    },
  ],
};

export const nulls: Schema = {
  name: 'Null Fixture',
  description: 'This fixture validates generation for nulls in JSON Schema.',
  type: Type.OBJECT,
  properties: [
    {
      name: 'null-type',
      type: Type.ANY,
      isNullable: true,
      enum: [null],
    },
    {
      name: 'nullable-string',
      type: Type.STRING,
      isNullable: true,
    },
    {
      name: 'null-union',
      type: Type.UNION,
      types: [{ type: Type.STRING }, { type: Type.BOOLEAN }],
      isNullable: true,
    },
    {
      name: 'simple-null-enum',
      type: Type.ANY,
      isNullable: true,
      enum: [null],
    },
    {
      name: 'multi-value-null-enum',
      type: Type.ANY,
      isNullable: true,
      enum: [true, false, null],
    },
    {
      name: 'nullable-string-enum',
      type: Type.STRING,
      isNullable: true,
      enum: ['yes', 'no', null],
    },
    {
      name: 'null-enum-union',
      type: Type.UNION,
      types: [
        { type: Type.STRING, enum: [true, false, 'yes', 'no', null] },
        { type: Type.BOOLEAN, enum: [true, false, 'yes', 'no', null] },
      ],
      isNullable: true,
      enum: [true, false, 'yes', 'no', null],
    },
  ],
};

export const required: Schema = {
  name: 'Required Properties Fixture',
  description:
    'This fixture validates generation for JSON Schema properties that are marked as required.',
  type: Type.OBJECT,
  properties: [
    {
      name: 'required-property',
      isRequired: true,
      isNullable: true,
      type: Type.ANY,
    },
    {
      name: 'optional-property',
      isNullable: true,
      type: Type.ANY,
    },
    {
      name: 'required-nested-property',
      isRequired: true,
      type: Type.OBJECT,
      properties: [
        {
          name: 'required-property',
          isRequired: true,
          isNullable: true,
          type: Type.ANY,
        },
        {
          name: 'optional-property',
          isNullable: true,
          type: Type.ANY,
        },
      ],
    },
    {
      name: 'optional-nested-property',
      type: Type.OBJECT,
      properties: [
        {
          name: 'required-property',
          isRequired: true,
          isNullable: true,
          type: Type.ANY,
        },
        {
          name: 'optional-property',
          isNullable: true,
          type: Type.ANY,
        },
      ],
    },
  ],
};

export const unions: Schema = {
  name: 'Union Types Fixture',
  description: 'This fixture validates generation for JSON Schema union types.',
  type: Type.OBJECT,
  properties: [
    {
      name: 'primitive-union',
      type: Type.UNION,
      types: [{ type: Type.STRING }, { type: Type.NUMBER }],
    },
    {
      name: 'primitive-or-object-union',
      type: Type.UNION,
      types: [
        {
          type: Type.STRING,
        },
        {
          type: Type.OBJECT,
          properties: [
            {
              name: 'name',
              type: Type.STRING,
            },
            {
              name: 'address',
              isNullable: true,
              type: Type.ANY,
            },
          ],
        },
      ],
    },
    {
      name: 'array-or-object-union',
      type: Type.UNION,
      types: [
        {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        {
          type: Type.OBJECT,
          properties: [
            {
              name: 'name',
              type: Type.STRING,
            },
            {
              name: 'address',
              isNullable: true,
              type: Type.ANY,
            },
          ],
        },
      ],
    },
  ],
};

export const customTypes: Schema = {
  name: 'Custom Types Fixture',
  description: 'This fixture validates generation for custom types.',
  type: Type.OBJECT,
  properties: [
    {
      name: 'booleanEnum',
      type: Type.BOOLEAN,
      enum: [true, false],
      _refName: 'ct-boo',
      description: 'Custom type for Custom Types Fixture',
    },
    {
      name: 'stringEnum',
      type: Type.STRING,
      enum: ['type1', 'type2', 'type3'],
      _refName: 'ct-string-enum',
      description: 'Custom type for Custom Types Fixture',
    },
    {
      name: 'numberEnum',
      type: Type.NUMBER,
      enum: [1, 2, 3],
      _refName: 'ct-number-enum',
      description: 'Custom type for Custom Types Fixture',
    },
    {
      name: 'objectType',
      type: Type.OBJECT,
      _refName: 'ct-object',
      description: 'Custom type for Custom Types Fixture',
      properties: [
        {
          name: 'name',
          type: Type.STRING,
          isRequired: true,
        },
        {
          name: 'value',
          type: Type.NUMBER,
        },
      ],
    },
    {
      name: 'arrayType',
      type: Type.ARRAY,
      _refName: 'ct-array',
      description: 'Custom type for Custom Types Fixture',
      items: {
        type: Type.STRING,
      },
    },
    {
      name: 'nestedType',
      type: Type.OBJECT,
      _refName: 'ct-nested',
      description: 'Custom type for Custom Types Fixture',
      properties: [
        {
          name: 'obj',
          type: Type.OBJECT,
          _refName: 'ct-object',
          description: 'Custom type for Custom Types Fixture',
          properties: [
            {
              name: 'name',
              type: Type.STRING,
              isRequired: true,
            },
            {
              name: 'value',
              type: Type.NUMBER,
            },
          ],
        },
        {
          name: 'enum',
          type: Type.STRING,
          _refName: 'ct-string-enum',
          description: 'Custom type for Custom Types Fixture',
          enum: ['type1', 'type2', 'type3'],
        },
      ],
    },
  ],
};

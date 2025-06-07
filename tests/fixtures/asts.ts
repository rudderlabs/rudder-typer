import { Schema, Type } from '../../src/generators/ast';

export const basicTypes: Schema = {
  name: 'Types Fixture',
  description: 'This fixture validates generation for the various JSON Schema types.',
  type: Type.OBJECT,
  _refName: '',
  properties: [
    {
      name: 'string',
      type: Type.STRING,
      _refName: '',
    },
    {
      name: 'integer',
      type: Type.INTEGER,
      _refName: '',
    },
    {
      name: 'number',
      type: Type.NUMBER,
      _refName: '',
    },
    {
      name: 'boolean',
      type: Type.BOOLEAN,
      _refName: '',
    },
    {
      name: 'any',
      type: Type.ANY,
      isNullable: true,
      _refName: '',
    },
    {
      name: 'array',
      type: Type.ARRAY,
      items: {
        type: Type.ANY,
      },
      _refName: '',
    },
    {
      name: 'object',
      type: Type.OBJECT,
      properties: [],
      _refName: '',
    },
    {
      name: 'null',
      type: Type.ANY,
      isNullable: true,
      enum: [null],
      _refName: '',
    },
  ],
};

export const enums: Schema = {
  name: 'Enums Fixture',
  description: 'This fixture validates generation for JSON Schema enums.',
  type: Type.OBJECT,
  _refName: '',
  properties: [
    {
      name: 'string-enum',
      type: Type.ANY,
      enum: ['boggs', 'rob', 'anastassia', 'evan', 'marc', 'nick'],
      _refName: '',
    },
    {
      name: 'number-enum',
      type: Type.ANY,
      enum: [8997, 8998, 8999],
      _refName: '',
    },
    {
      name: 'typed-enum',
      type: Type.STRING,
      enum: ['personas', 'protocols', 'connections', '<redacted>'],
      _refName: '',
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
      _refName: '',
    },
  ],
};

export const nested: Schema = {
  name: 'Nested Fixture',
  description:
    'This fixture validates generation for objects nested within other objects or arrays.',
  type: Type.OBJECT,
  _refName: '',
  properties: [
    {
      name: 'nested-object',
      type: Type.OBJECT,
      properties: [
        {
          name: 'name',
          type: Type.STRING,
          _refName: '',
        },
        {
          name: 'address',
          isNullable: true,
          type: Type.ANY,
          _refName: '',
        },
      ],
      _refName: '',
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
            _refName: '',
          },
          {
            name: 'address',
            isNullable: true,
            type: Type.ANY,
            _refName: '',
          },
        ],
      },
      _refName: '',
    },
  ],
};

export const nulls: Schema = {
  name: 'Null Fixture',
  description: 'This fixture validates generation for nulls in JSON Schema.',
  type: Type.OBJECT,
  _refName: '',
  properties: [
    {
      name: 'null-type',
      type: Type.ANY,
      isNullable: true,
      enum: [null],
      _refName: '',
    },
    {
      name: 'nullable-string',
      type: Type.STRING,
      isNullable: true,
      _refName: '',
    },
    {
      name: 'null-union',
      type: Type.UNION,
      types: [{ type: Type.STRING }, { type: Type.BOOLEAN }],
      isNullable: true,
      _refName: '',
    },
    {
      name: 'simple-null-enum',
      type: Type.ANY,
      isNullable: true,
      enum: [null],
      _refName: '',
    },
    {
      name: 'multi-value-null-enum',
      type: Type.ANY,
      isNullable: true,
      enum: [true, false, null],
      _refName: '',
    },
    {
      name: 'nullable-string-enum',
      type: Type.STRING,
      isNullable: true,
      enum: ['yes', 'no', null],
      _refName: '',
    },
    {
      name: 'null-enum-union',
      type: Type.UNION,
      types: [
        {
          type: Type.STRING,
          enum: [true, false, 'yes', 'no', null],
        },
        {
          type: Type.BOOLEAN,
          enum: [true, false, 'yes', 'no', null],
        },
      ],
      isNullable: true,
      enum: [true, false, 'yes', 'no', null],
      _refName: '',
    },
  ],
};

export const required: Schema = {
  name: 'Required Properties Fixture',
  description:
    'This fixture validates generation for JSON Schema properties that are marked as required.',
  type: Type.OBJECT,
  _refName: '',
  properties: [
    {
      name: 'required-property',
      isRequired: true,
      isNullable: true,
      type: Type.ANY,
      _refName: '',
    },
    {
      name: 'optional-property',
      isNullable: true,
      type: Type.ANY,
      _refName: '',
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
          _refName: '',
        },
        {
          name: 'optional-property',
          isNullable: true,
          type: Type.ANY,
          _refName: '',
        },
      ],
      _refName: '',
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
          _refName: '',
        },
        {
          name: 'optional-property',
          isNullable: true,
          type: Type.ANY,
          _refName: '',
        },
      ],
      _refName: '',
    },
  ],
};

export const unions: Schema = {
  name: 'Union Types Fixture',
  description: 'This fixture validates generation for JSON Schema union types.',
  type: Type.OBJECT,
  _refName: '',
  properties: [
    {
      name: 'primitive-union',
      type: Type.UNION,
      types: [{ type: Type.STRING }, { type: Type.NUMBER }],
      _refName: '',
    },
    {
      name: 'primitive-or-object-union',
      type: Type.UNION,
      types: [
        { type: Type.STRING },
        {
          type: Type.OBJECT,
          properties: [
            {
              name: 'name',
              type: Type.STRING,
              _refName: '',
            },
            {
              name: 'address',
              isNullable: true,
              type: Type.ANY,
              _refName: '',
            },
          ],
        },
      ],
      _refName: '',
    },
    {
      name: 'array-or-object-union',
      type: Type.UNION,
      types: [
        {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
        {
          type: Type.OBJECT,
          properties: [
            {
              name: 'name',
              type: Type.STRING,
              _refName: '',
            },
            {
              name: 'address',
              isNullable: true,
              type: Type.ANY,
              _refName: '',
            },
          ],
        },
      ],
      _refName: '',
    },
  ],
};

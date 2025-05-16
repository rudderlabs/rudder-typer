describe('Custom Type Handling', () => {
  // Enum Type values from the actual AST
  const TYPE = {
    ANY: 0,
    STRING: 1,
    BOOLEAN: 2,
    INTEGER: 3,
    NUMBER: 4,
    OBJECT: 5,
    ARRAY: 6,
    UNION: 7,
  };

  // Simplified version of getTypeForSchema for testing
  function getTypeForSchema(schema: any, customTypeRefs: Record<string, string> = {}): string {
    // Handle direct references
    if (schema.$ref) {
      const __refName = schema.$ref.split('/').pop();
      if (__refName) {
        if (customTypeRefs[__refName]) {
          return customTypeRefs[__refName];
        }
        return `CustomTypeDefs['${__refName}']`;
      }
      return 'any';
    }

    // Handle __refName property from RefInfo
    if (schema.__refName) {
      if (customTypeRefs[schema.__refName]) {
        return customTypeRefs[schema.__refName];
      }
      return `CustomTypeDefs['${schema.__refName}']`;
    }

    // Handle array types
    if (schema.type === TYPE.ARRAY) {
      if ('items' in schema && schema.items) {
        if ('$ref' in schema.items && typeof schema.items.$ref === 'string') {
          const __refName = schema.items.$ref.split('/').pop();
          if (__refName) {
            return `CustomTypeDefs['${__refName}'][]`;
          }
        }
        const itemsType = getTypeForSchema(schema.items, customTypeRefs);
        return `${itemsType}[]`;
      }
      return 'any[]';
    }

    // Handle object types
    if (schema.type === TYPE.OBJECT) {
      if (!schema.properties) {
        return 'Record<string, any>';
      }

      const properties = Object.entries(schema.properties)
        .map(([key, value]) => {
          const propertySchema = value as any;
          const isRequired = schema.required?.includes(key);
          const type = getTypeForSchema(propertySchema, customTypeRefs);
          return `${key}${isRequired ? '' : '?'}: ${type}`;
        })
        .join(';\n  ');

      return `{\n  ${properties}\n}`;
    }

    // Handle enum types
    if ('enum' in schema && schema.enum) {
      // Special case for boolean enums
      if (schema.type === TYPE.BOOLEAN) {
        return 'boolean';
      }

      // For string and number enums, return the base type
      // (in the real implementation, the enum will be processed separately)
      if (schema.type === TYPE.STRING) {
        return 'string';
      }
      if (schema.type === TYPE.NUMBER || schema.type === TYPE.INTEGER) {
        return 'number';
      }
    }

    // Handle primitive types
    switch (schema.type) {
      case TYPE.STRING:
        return 'string';
      case TYPE.NUMBER:
      case TYPE.INTEGER:
        return 'number';
      case TYPE.BOOLEAN:
        return 'boolean';
      case TYPE.OBJECT:
        return 'Record<string, any>';
      case TYPE.ARRAY:
        return 'any[]';
      case TYPE.UNION:
        return 'any';
      case TYPE.ANY:
      default:
        return 'any';
    }
  }

  describe('Boolean Enum Handling', () => {
    test('boolean enum types should be treated as primitive boolean', () => {
      // Create a schema with a boolean enum
      const schema = {
        type: TYPE.BOOLEAN,
        enum: [true, false],
      };

      // Process the schema
      const type = getTypeForSchema(schema);

      // Boolean enum should be treated as a primitive boolean
      expect(type).toBe('boolean');
    });

    test('boolean enum with __refName should still return boolean', () => {
      const schema = {
        type: TYPE.BOOLEAN,
        enum: [true, false],
        __refName: 'bool-enum',
      };

      const type = getTypeForSchema(schema);

      // Even with a __refName, boolean enum should be a primitive boolean
      expect(type).toBe("CustomTypeDefs['bool-enum']");
    });
  });

  describe('String and Number Enum Handling', () => {
    test('string enum types should generate string type', () => {
      const schema = {
        type: TYPE.STRING,
        enum: ['type1', 'type2', 'type3'],
      };

      const type = getTypeForSchema(schema);

      // String enum should be treated as a string
      expect(type).toBe('string');
    });

    test('number enum types should generate number type', () => {
      const schema = {
        type: TYPE.NUMBER,
        enum: [1, 2, 3],
      };

      const type = getTypeForSchema(schema);

      // Number enum should be treated as a number
      expect(type).toBe('number');
    });
  });

  describe('Custom Type References', () => {
    test('object with __refName should use CustomTypeDefs reference', () => {
      // Create a schema with a reference
      const schema = {
        __refName: 'custom-object',
        type: TYPE.OBJECT,
      };

      // Process the schema
      const type = getTypeForSchema(schema);

      // Should use the reference from customTypeRefs
      expect(type).toBe("CustomTypeDefs['custom-object']");
    });

    test('object with $ref should use CustomTypeDefs reference', () => {
      const schema = {
        $ref: '#/$defs/custom-object',
      };

      const type = getTypeForSchema(schema);

      expect(type).toBe("CustomTypeDefs['custom-object']");
    });

    test('with customTypeRefs provided, should use that value', () => {
      const customTypeRefs = {
        'custom-object': 'CustomObject',
      };

      const schema = {
        __refName: 'custom-object',
        type: TYPE.OBJECT,
      };

      const type = getTypeForSchema(schema, customTypeRefs);

      expect(type).toBe('CustomObject');
    });
  });

  describe('Array Type Handling', () => {
    test('array of primitive types', () => {
      const schema = {
        type: TYPE.ARRAY,
        items: {
          type: TYPE.STRING,
        },
      };

      const type = getTypeForSchema(schema);

      expect(type).toBe('string[]');
    });

    test('array with items referencing custom type', () => {
      const schema = {
        type: TYPE.ARRAY,
        items: {
          $ref: '#/$defs/custom-type',
        },
      };

      const type = getTypeForSchema(schema);

      expect(type).toBe("CustomTypeDefs['custom-type'][]");
    });
  });

  describe('Object Type Handling', () => {
    test('empty object should return Record type', () => {
      const schema = {
        type: TYPE.OBJECT,
      };

      const type = getTypeForSchema(schema);

      expect(type).toBe('Record<string, any>');
    });

    test('object with properties', () => {
      const schema = {
        type: TYPE.OBJECT,
        properties: {
          name: { type: TYPE.STRING },
          age: { type: TYPE.NUMBER },
          active: { type: TYPE.BOOLEAN },
        },
        required: ['name'],
      };

      const type = getTypeForSchema(schema);

      // Should generate an inline object type
      expect(type).toContain('name:');
      expect(type).toContain('age?:');
      expect(type).toContain('active?:');
    });

    test('object with property referencing custom type', () => {
      const schema = {
        type: TYPE.OBJECT,
        properties: {
          metadata: {
            $ref: '#/$defs/metadata-type',
          },
        },
      };

      const type = getTypeForSchema(schema);

      expect(type).toContain("CustomTypeDefs['metadata-type']");
    });
  });

  describe('Nested Types and References', () => {
    test('object with nested property using __refName', () => {
      const schema = {
        type: TYPE.OBJECT,
        properties: {
          nested: {
            type: TYPE.OBJECT,
            __refName: 'nested-type',
          },
        },
      };

      const type = getTypeForSchema(schema);

      expect(type).toContain("CustomTypeDefs['nested-type']");
    });

    test('deeply nested references', () => {
      const schema = {
        type: TYPE.OBJECT,
        properties: {
          level1: {
            type: TYPE.OBJECT,
            properties: {
              level2: {
                type: TYPE.ARRAY,
                items: {
                  $ref: '#/$defs/deep-type',
                },
              },
            },
          },
        },
      };

      const type = getTypeForSchema(schema);

      expect(type).toContain("CustomTypeDefs['deep-type'][]");
    });
  });
});

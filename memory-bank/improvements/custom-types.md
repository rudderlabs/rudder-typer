# Custom Types in JSON Schema

## Overview

Custom types allow for the definition of reusable type structures that can be referenced throughout a schema. They are defined in the `$defs` section of JSON Schema and referenced using `$ref`.

## Key Concepts

- **Type Definition**: Schemas defined in the `$defs` section of a JSON Schema
- **Type Reference**: Using `$ref: "#/$defs/TypeName"` to reference a defined type
- **Type Resolution**: Process of resolving references to their original definitions
- **Type Consolidation**: Gathering all custom types across multiple schemas into a unified set

## Type Categories

### Primitive Types

- String types (with or without enums)
- Number types (with or without enums)
- Boolean types
- Array types
- Object types with properties

### Complex Types

- Nested objects
- Arrays of custom types
- Union types (oneOf, anyOf)
- Objects with property references
- Arrays with item references

## Implementation Guidelines

1. **Parsing Phase**

   - Extract all custom types from `$defs` section
   - Process each definition into a standard schema format
   - Store all definitions in a central registry for reference resolution

2. **Reference Resolution**

   - When encountering a `$ref`, look up the full definition
   - Replace references with actual schema structures
   - Handle circular references properly

3. **Type Generation**

   - Convert schema types to appropriate language-specific types
   - Generate proper type annotations for each language target
   - Maintain consistent naming across generated code

4. **Code Output**
   - Create language-specific type declarations
   - Generate necessary imports and dependencies
   - Include documentation comments from schema

## Best Practices

1. **Type Safety**

   - Ensure type consistency across references
   - Validate that all references can be resolved
   - Handle nullable/optional types appropriately

2. **Naming Conventions**

   - Use consistent naming patterns across different languages
   - Follow language-specific naming conventions when generating code
   - Prefix enum values to avoid conflicts

3. **Optimization**

   - Deduplicate identical type definitions
   - Flatten unnecessary nesting when possible
   - Generate efficient type structures

4. **Error Handling**
   - Provide clear error messages for unresolved references
   - Detect and report circular references
   - Handle malformed schemas gracefully

## Common Patterns

- **Enum Generation**: Creating proper enum types from string/number enums
- **Object Mapping**: Converting schema objects to language-specific classes/interfaces
- **Array Typing**: Handling arrays of primitive and custom types
- **Nullable Handling**: Properly handling optional/nullable fields
- **Documentation Transfer**: Preserving schema descriptions as code comments

## Edge Cases

- Circular references in type definitions
- Forward references (references to types defined later)
- Mixed type arrays
- Deep nesting of references
- References across multiple schemas

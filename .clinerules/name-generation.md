## Brief overview

Guidelines for generating names in code generation tasks, with a focus on TypeScript but extensible to other languages. Emphasizes clean, predictable naming patterns and proper handling of edge cases.

## Architecture preferences

- Use a base class for core name generation functionality that can be extended for language-specific implementations
- Keep collision detection and sanitization logic separate from language-specific naming rules
- Favor composition allowing easy addition of new language support
- Use clear scope separation for name uniqueness (e.g., separate scopes for types vs properties)

## Naming conventions

- Generate type names that maintain full context (e.g., UserSignedUpTrackEventAddressProperties)
- Keep property names scoped to their containing type to avoid unnecessary suffixes
- Include the event name in nested object type names to maintain context hierarchy
- Use proper casing based on context (camelCase for properties, PascalCase for types)

## Edge case handling

- Handle language-specific reserved keywords by prefixing with underscore
- Sanitize names containing invalid characters by replacing them with underscores
- Prefix numeric-starting identifiers with underscore
- Name collisions should be resolved by appending numeric suffixes within their scope
- Ensure nested object types maintain parent context in their names

## Testing strategy

- Test fixtures should demonstrate:
  - Multi-level nesting capabilities
  - Edge case handling (reserved words, numeric prefixes)
  - Name collision resolution
  - Cross-type property reuse

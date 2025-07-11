# Key Issues and AI Guidelines

## Critical Points to Remember

### 1. Type System Integrity

- **Required vs Nullable**: Never conflate required-ness with nullability
- **Type Consistency**: Maintain strict 1:1 mapping between schema and generated types
- **Enum Handling**: Always properly quote and serialize enum values
- **Symbol Encoding**: Ensure proper encoding of symbol names in all languages

### 2. Documentation Standards

- **Comment Blocks**: Keep all documentation within proper language-specific comment blocks
- **Field Names**: Maintain exact field name matching between schema and generated code
- **Type Documentation**: Document all type definitions and relationships clearly

### 3. Language-Specific Requirements

- **Java/Kotlin**:
  - Prefer compile-time validation over runtime checks
  - Consider Kotlin compatibility in Java code
  - Evaluate alternatives to builder pattern
- **JavaScript/TypeScript**:
  - Ensure proper type definitions
  - Maintain consistent naming
  - Handle async/await properly
- **Swift/Objective-C**:
  - Follow ARC guidelines
  - Handle optionals correctly
  - Maintain proper memory management

### 4. Versioning and Breaking Changes

- **Semantic Versioning**: Always increment major version for breaking changes
- **Backward Compatibility**: Maintain backward compatibility in minor/patch releases
- **Release Notes**: Document all breaking changes clearly
- **Migration Paths**: Provide clear migration guides for breaking changes

### 5. Testing Requirements

- **Coverage**: Ensure comprehensive test coverage
- **Regression Tests**: Add tests for all fixes
- **Edge Cases**: Test all edge cases thoroughly
- **Integration Tests**: Include integration tests for all features

### 6. Authentication and API

- **Token Handling**: Remove unnecessary email requirement
- **API Validation**: Implement proper input validation
- **Error Handling**: Provide clear error messages and codes
- **Security**: Follow security best practices

## AI Implementation Guidelines

### 1. Code Generation

- Always validate generated code against schema
- Ensure proper type safety in all languages
- Maintain consistent naming conventions
- Handle edge cases gracefully

### 2. Error Handling

- Provide clear, actionable error messages
- Include context in error reporting
- Implement proper error recovery
- Log errors appropriately

### 3. Performance

- Optimize code generation
- Minimize memory usage
- Implement proper caching
- Handle large schemas efficiently

### 4. Documentation

- Keep documentation up to date
- Include examples where helpful
- Document all breaking changes
- Maintain clear migration guides

### 5. Testing

- Write comprehensive tests
- Include edge case tests
- Test all language variants
- Verify backward compatibility

## Red Flags to Watch For

1. Breaking changes in minor/patch releases
2. Missing test coverage
3. Inconsistent naming
4. Improper type handling
5. Documentation outside comment blocks
6. Runtime checks that could be compile-time
7. Missing error handling
8. Incomplete edge case coverage

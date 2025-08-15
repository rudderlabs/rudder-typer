# Custom Types Implementation Plan

## Overview

Implementation of `$defs` support in RudderTyper for handling custom types in Tracking Plan schemas.

## Implementation Phases

### Phase 1: Core Type Resolution

1. **Schema Parser Enhancement**

   - Implement reference resolution logic
   - Handle circular reference detection
   - Add type deduplication tracking

2. **Type Generation Core**
   - Implement type name resolution
   - Add type dependency tracking
   - Handle nested type references

### Phase 2: Language-Specific Implementations

1. **TypeScript/JavaScript**

   - Generate enums for string enums
   - Generate interfaces for object types
   - Implement proper type imports
   - Add JSDoc comments

2. **Java/Kotlin**

   - Generate enum classes
   - Create builder patterns
   - Implement proper type imports
   - Add JavaDoc comments

3. **Swift/Objective-C**
   - Generate Swift enums
   - Create proper type mappings
   - Handle optional types
   - Add documentation comments

### Phase 3: Integration & Testing

1. **Integration Points**

   - Update event interface generation
   - Modify property type resolution
   - Integrate with existing generators
   - Update CLI options

2. **Testing**
   - Add unit tests for type resolution
   - Create integration tests
   - Add sample tracking plans
   - Test edge cases

## Technical Specifications

### 1. Type Resolution System

```typescript
export enum CtypeStr {
  S_WEB = 'web',
  S_MOBILE = 'mobile',
  S_IPAD = 'ipad',
  S_IPOD = 'ipod',
}

export interface Ctype45 {
  'prop-45': any;
}

/**
 * Consolidated custom types from $defs
 * This interface maps the original schema names to their generated TypeScript types
 */
export interface CustomTypeDefs {
  /**
   * Custom type for Add Shipping Information
   */
  'Ctype-arr-str1'?: string[];
  /**
   * Custom type for Add Shipping Information
   */
  'Ctype-str'?: CtypeStr;
  /**
   * Custom type for Add Shipping Information
   */
  'Sstart-using-custom-type'?: number;
  /**
   * Custom type for Cart Shared
   */
  'Ctype-45'?: Ctype45;
}

export interface AddShippingInformation {
  'Ctype-str34'?: CustomTypeDefs['Ctype-arr-str1'];
  'proprty-arr-str-otter1'?: CustomTypeDefs['Ctype-str'][];
  test?: CustomTypeDefs['Sstart-using-custom-type'];
}
```

### 2. Naming Conventions

- **Type Names**: PascalCase (e.g., `DeviceType`)
- **Enum Values**: UPPER_SNAKE_CASE with prefix (e.g., `S_WEB`)
- **Properties**: camelCase (e.g., `deviceTypeList`)

### 3. Edge Cases Handling

1. **Circular References**

   - Detect during resolution
   - Generate forward declarations
   - Handle in language-specific ways

2. **Name Conflicts**

   - Add suffix for conflicts
   - Maintain mapping table
   - Update references

3. **Nested Types**
   - Flatten when possible
   - Generate proper imports
   - Handle scope correctly

## Testing Strategy

### Unit Tests

- Type resolution
- Name generation
- Edge case handling
- Language-specific generation

### Integration Tests

- Full tracking plan processing
- Cross-language consistency
- CLI integration
- Sample tracking plans

## Migration Plan

1. **Backward Compatibility**

   - Support both old and new formats
   - Add migration warnings
   - Document changes

2. **Documentation**
   - Update README
   - Add examples
   - Document new features

## Success Criteria

1. **Functionality**

   - [ ] All `$defs` types are properly resolved
   - [ ] Generated code is type-safe
   - [ ] No circular reference issues
   - [ ] Proper naming conventions

2. **Quality**

   - [ ] 100% test coverage for new code
   - [ ] No regression in existing features
   - [ ] All edge cases handled
   - [ ] Documentation complete

3. **Performance**
   - [ ] No significant impact on generation time
   - [ ] Memory usage within limits
   - [ ] Efficient type resolution

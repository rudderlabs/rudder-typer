# Rudder-typer Code Quality Guidelines

## Core Principles

### DRY (Don't Repeat Yourself)

- Avoid duplicating logic across the codebase
- Extract common patterns into reusable functions
- Use generics when appropriate for type-safe reusability

### Small, Focused Functions

- Create small, single-purpose functions rather than large monolithic ones
- Aim for functions that do one thing well and are easy to test
- Keep function bodies short (preferably under 20 lines)
- Name functions clearly to reflect their purpose
- Design functions to be composable and reusable across the codebase

### Conservative Code Changes

- Minimize changes to existing code unless absolutely necessary
- Focus on adding functionality rather than refactoring working code
- When making changes, maintain the same style and patterns as surrounding code

### Concise Implementation

- Keep implementations short and focused
- Prefer clear, readable code over clever optimizations
- Aim for single responsibility in functions and classes

### Project Structure

- Prefer adding code to core utility files (`gen.ts`, etc.) rather than SDK-specific folders
- Keep SDK-specific logic isolated to their respective folders
- Place shared utility functions in the outermost appropriate folder

### Abstraction Hierarchy

1. First consider if functionality can be added to `gen.ts`
2. Consider placing in `ast.ts` for schema/type handling
3. Only place code in SDK-specific folders if it truly belongs there

### Type Safety

- Maintain strong typing throughout the codebase
- Avoid using `any` type when possible
- Use interfaces and type aliases to model complex structures

### Recursive Patterns

- Prefer recursive functions over deeply nested conditionals
- Ensure recursive functions have clear termination conditions
- Use helper functions for complex traversal logic

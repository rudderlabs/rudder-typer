/**
 * Base class for generating valid identifiers in a programming language.
 * Provides common functionality for name collision handling and sanitization,
 * while allowing language-specific customization through abstract methods.
 */
export abstract class BaseNamer {
  /**
   * Set of reserved keywords for the target programming language.
   * These will be prefixed with an underscore when used as identifiers.
   */
  protected abstract reservedKeywords: Set<string>;
  private generatedNames: Record<string, Set<string>> = {};
  private nameIdMap: Record<string, Record<string, string>> = {};

  /**
   * Sanitizes an input string to create a valid identifier in the target language.
   * Each language implementation defines its own rules for valid characters and formatting.
   * @param name The input string to sanitize
   * @returns A valid identifier string
   */
  public abstract sanitize(name: string): string;

  /**
   * Retrieves a previously generated name by its ID and scope.
   *
   * @param id The unique identifier used when registering the name
   * @param scope The namespace for collision detection (e.g., 'types', 'properties/MyType')
   * @returns The generated name if found, undefined otherwise
   */
  public getName(id: string, scope: string = 'default'): string | undefined {
    return this.nameIdMap[scope]?.[id];
  }

  /**
   * Registers a unique name within a given scope by handling collisions.
   * If a name has already been registered with the given ID, returns that name.
   * Otherwise, if the name already exists in the scope, appends a numeric suffix.
   *
   * @param name The base name to register
   * @param scope The namespace for collision detection (e.g., 'types', 'properties/MyType')
   * @param id A unique identifier to associate with this name
   * @returns A unique name within the given scope
   */
  public registerName(id: string, name: string, scope: string): string {
    const existingName = this.getName(id, scope);
    if (existingName) {
      return existingName;
    }

    if (!this.generatedNames[scope]) {
      this.generatedNames[scope] = new Set();
    }

    let finalName = this.sanitize(name);
    if (this.reservedKeywords.has(finalName.toLowerCase())) {
      finalName = `_${finalName}`;
    }

    let counter = 1;
    const originalName = finalName;

    while (this.generatedNames[scope].has(finalName)) {
      finalName = `${originalName}_${counter}`;
      counter++;
    }

    this.generatedNames[scope].add(finalName);

    if (!this.nameIdMap[scope]) {
      this.nameIdMap[scope] = {};
    }
    this.nameIdMap[scope][id] = finalName;

    return finalName;
  }
}

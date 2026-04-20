import { convertToEnum, convertToUnion } from '../src/generators/javascript/enums';

describe('convertToUnion (enumStyle: "union")', () => {
  test('emits string literal union for plain string enum', () => {
    expect(convertToUnion(['happy', 'sad', 'meh'], 'string')).toBe("'happy' | 'sad' | 'meh'");
  });

  test('emits number literal union for plain number enum', () => {
    expect(convertToUnion([200, 404, 500], 'number')).toBe('200 | 404 | 500');
  });

  test('escapes single quotes inside string literals', () => {
    expect(convertToUnion(["it's", 'plain'], 'string')).toBe("'it\\'s' | 'plain'");
  });

  test('handles mixed string|number union types', () => {
    expect(convertToUnion(['yes', 1, 'no', 2], 'string | number')).toBe("'yes' | 1 | 'no' | 2");
  });

  test('drops booleans (parity with convertToEnum which does the same)', () => {
    expect(convertToUnion(['yes', 'no', true, false], 'string | boolean')).toBe("'yes' | 'no'");
  });

  test('returns "never" when no values survive (e.g. all booleans)', () => {
    expect(convertToUnion([true, false], 'boolean')).toBe('never');
  });

  test('trims whitespace inside string literals', () => {
    expect(convertToUnion(['  spaced  ', 'tight'], 'string')).toBe("'spaced' | 'tight'");
  });

  test('returns "never" for empty enum', () => {
    expect(convertToUnion([], 'string')).toBe('never');
  });
});

describe('convertToEnum (default style — backward compatibility)', () => {
  test('emits string-keyed enum body for plain string enum', () => {
    expect(convertToEnum(['happy', 'sad'], 'string')).toBe(
      "S_HAPPY = 'happy',\n    S_SAD = 'sad',",
    );
  });

  test('emits number-keyed enum body for plain number enum', () => {
    expect(convertToEnum([200, 404], 'number')).toBe('N_200 = 200,\n    N_404 = 404,');
  });

  test('drops booleans (preserves pre-PR behaviour)', () => {
    expect(convertToEnum(['yes', true], 'string | boolean')).toBe("S_YES = 'yes',");
  });
});

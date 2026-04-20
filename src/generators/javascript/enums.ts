import { sanitizeKey } from '../utils.js';

// Builds the body of an `enum X { ... }` declaration, e.g.
// "S_FOO = 'foo',\n    S_BAR = 'bar',".
// Booleans/nulls are dropped because TS string/number enums only accept those
// two literal types.
export const convertToEnum = (values: any[], type: string): string => {
  const unionTypes = [...new Set(type.split(' | '))];

  return (
    values
      .map((value) => {
        let key, formattedValue;

        if (type === 'number' || (unionTypes.includes('number') && typeof value === 'number')) {
          key = 'N_' + sanitizeKey(value);
          formattedValue = `${value}`;
        } else if (
          type === 'string' ||
          (unionTypes.includes('string') && typeof value === 'string')
        ) {
          key = 'S_' + sanitizeKey(value);
          formattedValue = `'${value.toString().replace(/'/g, "\\'").trim()}'`;
        }

        return key && formattedValue ? `${key} = ${formattedValue}` : null;
      })
      .filter(Boolean)
      .join(',\n    ') + ','
  );
};

// Builds the body of a `type X = ...` declaration, e.g. "'foo' | 'bar'".
// Booleans/nulls are dropped to mirror convertToEnum behaviour; extending this
// to include them is straightforward (TS supports `true`/`false`/`null` literals)
// and can be done in a follow-up.
// Returns "never" when no values survive — produces a valid (uninhabited) type
// rather than empty output that would fail to compile.
export const convertToUnion = (values: any[], type: string): string => {
  const unionTypes = [...new Set(type.split(' | '))];

  const literals = values
    .map((value) => {
      if (type === 'number' || (unionTypes.includes('number') && typeof value === 'number')) {
        return `${value}`;
      }
      if (type === 'string' || (unionTypes.includes('string') && typeof value === 'string')) {
        return `'${value.toString().replace(/'/g, "\\'").trim()}'`;
      }
      return null;
    })
    .filter((v): v is string => v !== null);

  return literals.length > 0 ? literals.join(' | ') : 'never';
};

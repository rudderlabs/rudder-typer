// Which RudderStack SDK to generate for.
export enum SDK {
  WEB = 'analytics.js',
  NODE = 'analytics-node',
  IOS = 'analytics-ios',
  ANDROID = 'analytics-android',
}

// Which language to generate clients for.
export enum Language {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  OBJECTIVE_C = 'objective-c',
  SWIFT = 'swift',
  JAVA = 'java',
}

export type EnumStyle = 'enum' | 'union';

export type TypeScriptOptions = {
  sdk: SDK.WEB | SDK.NODE;
  language: Language.TYPESCRIPT;
  // support for capturing and rendering definitions
  // present on the tracking plan
  defSupport: true;
  uniqueEnums?: boolean;
  // Output style for enum-constrained schemas. Defaults to 'enum'.
  //   'enum'  → emits `export enum X { S_FOO = 'foo', S_BAR = 'bar' }` (nominal type)
  //   'union' → emits `export type X = 'foo' | 'bar'` (string literal union, structurally
  //             assignable from plain string literals — pairs well with consumers whose
  //             source values are typed as literal unions or differently-named enums.)
  enumStyle?: EnumStyle;
};

export type JavaScriptOptions = {
  sdk: SDK.WEB | SDK.NODE;
  language: Language.JAVASCRIPT;
  // JavaScript transpilation settings:
  scriptTarget?:
    | 'ES3'
    | 'ES5'
    | 'ES2015'
    | 'ES2016'
    | 'ES2017'
    | 'ES2018'
    | 'ES2019'
    | 'ESNext'
    | 'Latest';
  moduleTarget?: 'CommonJS' | 'AMD' | 'UMD' | 'System' | 'ES2015' | 'ESNext';
  // defSupport is true for Javascript as well
  defSupport: true;
  uniqueEnums?: boolean;
  // See TypeScriptOptions.enumStyle. JavaScript output is transpiled from TypeScript;
  // when 'union' is set the union-typed declaration is erased and only runtime values remain.
  enumStyle?: EnumStyle;
};

export type ObjectiveCOptions = {
  sdk: SDK.IOS;
  language: Language.OBJECTIVE_C;
  defSupport: false;
};

export type SwiftOptions = {
  sdk: SDK.IOS;
  language: Language.SWIFT;
  defSupport: false;
};

export type JavaOptions = {
  sdk: SDK.ANDROID;
  language: Language.JAVA;
  defSupport: false;
};

export type Options =
  | JavaScriptOptions
  | ObjectiveCOptions
  | SwiftOptions
  | JavaOptions
  | TypeScriptOptions;

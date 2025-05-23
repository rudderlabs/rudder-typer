import * as fs from 'fs';
import Handlebars from 'handlebars';
import { promisify } from 'util';
import { resolve } from 'path';

const readFile = promisify(fs.readFile);

/**
 * Header used to mark generated files that are safe to remove during generation.
 * This note needs to be in every generated file (except plan.json), otherwise
 * that file will not be cleaned up before client generation. This can be placed
 * anywhere in a file, though prefer placing it at the top of every file.
 *
 * If you change this, make sure to update the Build step to recognize previous
 * versions of this header when identifying files safe to remove.
 */
export const RUDDER_AUTOGENERATED_FILE_WARNING =
  'This client was automatically generated by RudderTyper. ** Do Not Edit **';

// Renders a string generated from a template using the provided context.
// The template path is relative to the `src` directory.
export async function generateFromTemplate<Context extends Record<string, unknown>>(
  templatePath: string,
  context: Context,
  needsWarning?: boolean,
): Promise<string> {
  const path = resolve(import.meta.dirname, templatePath);
  const template = await readFile(path, {
    encoding: 'utf-8',
  });
  const templater = Handlebars.compile(template, {
    noEscape: true,
  });

  const content = templater(context);

  if (needsWarning && !content.includes(RUDDER_AUTOGENERATED_FILE_WARNING)) {
    throw new Error(
      `This autogenerated file (${templatePath}) is missing a warning, and therefore will not be cleaned up in future runs.`,
    );
  }

  return content;
}

export async function registerPartial(partialPath: string, partialName: string): Promise<void> {
  const path = resolve(import.meta.dirname, partialPath);
  const template = await readFile(path, {
    encoding: 'utf-8',
  });
  const templater = Handlebars.compile(template, {
    noEscape: true,
  });

  Handlebars.registerPartial(partialName, templater);
}

export async function registerStandardHelpers(): Promise<void> {
  // Register a helper for indenting multi-line output from other helpers.
  Handlebars.registerHelper('indent', (indentation: string, content: string) => {
    return content.split('\n').join(`\n${indentation}`).trim();
  });
  // Register a helper to output a warning that a given file was automatically
  // generated by RudderTyper. Note that the exact phrasing is important, since
  // it is used to clear generated files. See `clearFolder` in `commands.ts`.
  Handlebars.registerHelper('autogeneratedFileWarning', () => {
    return RUDDER_AUTOGENERATED_FILE_WARNING;
  });
  // Register the ifEquals helper
  Handlebars.registerHelper('ifEquals', function (this: any, arg1, arg2, options) {
    return arg1 === arg2 ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('eq', function (arg1, arg2) {
    return arg1 === arg2;
  });
  Handlebars.registerHelper('not', function (value) {
    return !value;
  });
  Handlebars.registerHelper('or', function (val1, val2) {
    return val1 || val2;
  });
  Handlebars.registerHelper('and', function (val1, val2) {
    return val1 && val2;
  });

  const processedEnums = new Set();
  Handlebars.registerHelper('uniqueEnum', function (enumName, enumValues, options) {
    if (!processedEnums.has(enumName)) {
      processedEnums.add(enumName);
      return options.fn({ enumName, enumValues });
    }
    return '';
  });

  Handlebars.registerHelper('indentDoc', function (text: string, indentation: string) {
    if (!text) return '';

    const lines = text.split('\n');

    return lines.map((line) => indentation + line).join('\n');
  });
}

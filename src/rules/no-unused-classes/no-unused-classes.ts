import * as path from "path";
import * as fs from "fs";

import { ESLintUtils, TSESTree, ASTUtils } from "@typescript-eslint/utils";
import * as cssTree from "css-tree";

type MarkAsUsedOptions = {
  markAsUsed: string[];
};

type RuleOptions = readonly [MarkAsUsedOptions];

type SharedSettings = {
  "@jespers/css-modules"?: {
    basePath?: string;
  };
};

const createRule = ESLintUtils.RuleCreator(() => "");

/** Checks whether the provided file path ends with .module.css */
function isCssFile(importFilePath: string): boolean {
  // https://regex101.com/r/o0RtYT/1
  return /.+\.module\.(scss|css)$/i.test(importFilePath);
}

function resolvePhysicalCssFilePath(
  sourceFilePath: string,
  importFilePath: string,
  basePath = ""
): string {
  if (importFilePath.startsWith(".")) {
    const dirname = path.dirname(sourceFilePath);
    return path.resolve(dirname, importFilePath);
  }

  return path.resolve(basePath, importFilePath);
}

function fileExists(physicalFilePath: string): boolean {
  return fs.existsSync(physicalFilePath);
}

function parseCssAst(css: string): cssTree.CssNode {
  return cssTree.parse(css);
}

/** Creates an AST of the CSS file */
function parseCssFileAst(physicalCssFilePath: string): cssTree.CssNode {
  const contents = fs.readFileSync(physicalCssFilePath, "utf8");

  const ast = parseCssAst(contents);

  return ast;
}

/** Collects class names from CSS file's AST */
function getCssFileClassNames(cssAst: cssTree.CssNode): Set<string> {
  const classNames: Set<string> = new Set();

  cssTree.walk(cssAst, {
    visit: "ClassSelector",
    enter(node: cssTree.ClassSelector) {
      classNames.add(node.name);
    },
  });

  return classNames;
}

function getBasePathSetting(settings: unknown): string | undefined {
  const pluginSettings = ((settings as SharedSettings) ?? {})[
    "@jespers/css-modules"
  ];

  const { basePath } = pluginSettings ?? {};

  if (typeof basePath === "string" && basePath) {
    return basePath;
  }

  return undefined;
}

function getMarkAsUsedOption(options: unknown): Set<string> {
  const markAsUsedClassNames: Set<string> = new Set();

  if (Array.isArray(options as RuleOptions)) {
    (options as RuleOptions)[0]?.markAsUsed?.forEach(
      markAsUsedClassNames.add,
      markAsUsedClassNames
    );
  }

  return markAsUsedClassNames;
}

function getPrettyUnusedClassNames(unusedClassNames: string[]): string {
  const base = unusedClassNames
    .slice(0, 3)
    .map((className) => `'${className}'`)
    .join(", ");

  if (unusedClassNames.length <= 3) {
    return base;
  }

  return `${base}... (+${Math.max(0, unusedClassNames.length - 3)} more)`;
}

function getFixPayloadClassNames(unusedClassNames: string[]): string {
  return unusedClassNames.map((className) => `'${className}'`).join(", ");
}

const rule = createRule({
  name: "no-unused-classes",
  defaultOptions: [
    {
      markAsUsed: [],
    },
  ] as RuleOptions,
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          markAsUsed: {
            type: "array",
          },
        },
      },
    ],
    docs: {
      description: "Check for any unused classes in imported CSS modules",
      url: "https://github.com/jesperjohansson/eslint-plugin-css-modules",
    },
    messages: {
      unusedCssClasses:
        "Unused CSS classes {{ classNames }} in '{{ cssFilePath }}'",
      markAsUsed: "Mark {{ classNames }} as used",
    },
    hasSuggestions: true,
    fixable: "code",
  },
  create(context) {
    const sourceCode = context.sourceCode;

    type SourceFilePath = string;

    const files: Map<
      SourceFilePath,
      {
        availableClassNames: Set<string>;
        usedClassNames: Set<string>;
        meta?: {
          importNode: TSESTree.ImportDeclaration;
          cssFilePath: string;
        };
      }
    > = new Map();

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const sourceFilePath: string = context.getFilename();
        const importFilePath: string = node.source.value;

        if (isCssFile(importFilePath)) {
          const basePath: string | undefined = getBasePathSetting(
            context.settings
          );
          const cssFilePath = resolvePhysicalCssFilePath(
            sourceFilePath,
            importFilePath,
            basePath
          );

          if (fileExists(cssFilePath)) {
            const cssAst = parseCssFileAst(cssFilePath);

            /** Classes declared in CSS file */
            const classNames = getCssFileClassNames(cssAst);

            if (classNames.size > 0) {
              const file = files.get(sourceFilePath);

              const meta = file?.meta ?? {
                importNode: node,
                cssFilePath,
              };

              const availableClassNames =
                file?.availableClassNames ?? new Set();

              if (!files.has(sourceFilePath)) {
                files.set(sourceFilePath, {
                  availableClassNames,
                  usedClassNames: new Set(),
                  meta,
                });
              }

              // Iterate over the classes from the CSS file
              classNames.forEach((className) => {
                // Add the class to available classes
                availableClassNames.add(className);
              });
            }
          }
        }
      },
      MemberExpression(node: TSESTree.MemberExpression) {
        /**
         * Accessed property's name, for example `main` in `styles.main`.
         * We check if this property name is one of the CSS class names later.
         */
        const propertyName: string | null = ASTUtils.getPropertyName(
          node,
          sourceCode.getScope(node)
        );

        if (propertyName) {
          const sourceFilePath: string = context.getFilename();

          const usedClassNames =
            files.get(sourceFilePath)?.usedClassNames ?? new Set();

          // Create the file map entry if needed
          if (!files.has(sourceFilePath)) {
            files.set(sourceFilePath, {
              availableClassNames: new Set(),
              usedClassNames,
            });
          }

          // Add the property name to used class names
          usedClassNames.add(propertyName);
        }
      },
      "Program:exit"() {
        const markAsUsedClassNames =
          files.size > 0
            ? getMarkAsUsedOption(context.options)
            : new Set<string>();

        // Iterate over the files map
        files.forEach(({ availableClassNames, usedClassNames, meta }) => {
          /**
           * Array of unused CSS classes. Available classes, filtered by used classes and "mark as used" classes.
           */
          const unusedClassNames = [...availableClassNames.values()].filter(
            (className) =>
              !usedClassNames.has(className) &&
              !markAsUsedClassNames.has(className)
          );

          if (unusedClassNames.length > 0) {
            const { importNode, cssFilePath } = meta ?? {};

            if (importNode && cssFilePath) {
              const prettyClassNames: string =
                getPrettyUnusedClassNames(unusedClassNames);
              const fixPayloadClassNames: string =
                getFixPayloadClassNames(unusedClassNames);

              context.report({
                node: importNode, // The AST node
                messageId: "unusedCssClasses", // The error message ID
                // Used for string interpolation in the error message
                data: {
                  classNames: prettyClassNames, // The unused CSS class name
                  cssFilePath, // The CSS file path
                },
                suggest: [
                  {
                    fix: (val) => {
                      return val.insertTextBeforeRange(
                        importNode.range,
                        `/* eslint @jespers/css-modules/no-unused-classes: [2, { markAsUsed: [${fixPayloadClassNames}] }] */\n`
                      );
                    },
                    messageId: "markAsUsed",
                    data: { classNames: fixPayloadClassNames },
                  },
                ],
              });
            }
          }
        });
      },
    };
  },
});

const noUnusedClasses = rule;

export default noUnusedClasses;

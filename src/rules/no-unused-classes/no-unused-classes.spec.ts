import * as path from "path";
import * as tsParser from "@typescript-eslint/parser";
import { RuleTester } from "eslint";

import noUnusedClasses from "./no-unused-classes.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      sourceType: "module",
    },
  },
});

const fixtureFilename = path.resolve(__dirname, "../../fixtures/file.ts");

ruleTester.run("no-unused-classes", noUnusedClasses as any, {
  valid: [
    {
      code: `
        import styles from "./component01.module.css";

        const used = styles.main;
      `,
      filename: fixtureFilename,
    },
    {
      code: `
        import styles from "./folder/component02.module.css";

        const used = styles.main;
      `,
      filename: fixtureFilename,
    },
    {
      code: `
        import styles from "./folder/component02.module.css";

        const used = styles['main'];
      `,
      filename: fixtureFilename,
    },
    {
      code: `
        import styles from "./component03.module.css";
  
        const used = styles['main'];
      `,
      filename: fixtureFilename,
      options: [
        {
          markAsUsed: ["not-used"],
        },
      ],
    },
  ],
  invalid: [
    {
      code: 'import styles from "./component01.module.css";',
      filename: fixtureFilename,
      errors: [{ messageId: "unusedCssClasses", suggestions: 1 as any }],
    },
    {
      code: `
        import styles from "./component01.module.css";

        const unused = styles;
      `,
      filename: fixtureFilename,
      errors: [{ messageId: "unusedCssClasses", suggestions: 1 as any }],
    },
    {
      code: 'import styles from "./folder/component02.module.css";',
      filename: fixtureFilename,
      errors: [{ messageId: "unusedCssClasses", suggestions: 1 as any }],
    },
    {
      code: `
        import styles from "./folder/component02.module.css";

        const unused = styles;
      `,
      filename: fixtureFilename,
      errors: [{ messageId: "unusedCssClasses", suggestions: 1 as any }],
    },
    {
      code: `
        import styles from "./component03.module.css";

        const used = styles['main'];
      `,
      filename: fixtureFilename,
      errors: [{ messageId: "unusedCssClasses", suggestions: 1 as any }],
    },
  ],
});

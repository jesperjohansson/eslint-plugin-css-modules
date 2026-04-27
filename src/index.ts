import rules from "./rules/index.js";
import createConfigs from "./configs/create-configs.js";

import pkg from "./pkg.js";

const plugin: {
  meta: {
    name: string;
    version: string;
  };
  rules: typeof rules;
  configs: {
    [key: string]: unknown;
    legacy: unknown;
    recommended: unknown;
  };
} = {
  meta: {
    name: pkg.name,
    version: pkg.version,
  },
  rules,
  configs: {} as {
    [key: string]: unknown;
    legacy: unknown;
    recommended: unknown;
  },
};

plugin.configs = createConfigs(plugin);

export default plugin;

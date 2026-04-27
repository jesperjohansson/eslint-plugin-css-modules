import legacy from "./legacy.js";
import createRecommended from "./create-recommended.js";

function createConfigs(plugin: unknown) {
  return {
    legacy,
    recommended: createRecommended(plugin),
  };
}

export default createConfigs;

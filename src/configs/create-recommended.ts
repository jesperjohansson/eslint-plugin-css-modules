function createRecommended(plugin: unknown) {
  return {
    plugins: {
      "@jespers/css-modules": plugin,
    },
    rules: {
      "@jespers/css-modules/no-unused-classes": "error",
    },
  };
}

export default createRecommended;

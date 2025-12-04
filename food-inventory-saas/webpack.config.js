module.exports = function (options) {
  // Remove ForkTsCheckerWebpackPlugin to avoid memory issues
  // Type checking is done during development
  const filteredPlugins = options.plugins.filter(
    plugin => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
  );

  return {
    ...options,
    plugins: filteredPlugins,
  };
};

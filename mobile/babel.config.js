module.exports = function (api) {
  api.cache(true);
  const plugins = [];

  // Strips all console.* calls in production and Babel-release builds
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.BABEL_ENV === 'production' ||
    process.env.APP_ENV === 'production'
  ) {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: plugins,
  };
};

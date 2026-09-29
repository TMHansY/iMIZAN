const faceApiBrowserBundle = require.resolve('@vladmandic/face-api/dist/face-api.esm.js');
const cocoSsdBrowserBundle = require.resolve('@tensorflow-models/coco-ssd/dist/coco-ssd.es2017.esm.min.js');

module.exports = function override(config) {
  // The browser ESM bundle includes a Node-only require helper. Parsing it as
  // CommonJS creates spurious dependency contexts for code browsers never use.
  config.module.rules.push({
    include: faceApiBrowserBundle,
    type: 'javascript/esm',
  });

  const sourceMapRule = config.module.rules.find((rule) =>
    rule.loader?.includes('source-map-loader'),
  );
  if (sourceMapRule) {
    sourceMapRule.options = {
      ...sourceMapRule.options,
      // COCO-SSD 2.2.3 references a map absent from its published package.
      // Keep source maps and warnings enabled for every other module.
      filterSourceMappingUrl: (url, resourcePath) =>
        resourcePath !== cocoSsdBrowserBundle || url !== 'coco-ssd.es2017.esm.min.js.map',
    };
  }

  return config;
};

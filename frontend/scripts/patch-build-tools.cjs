const fs = require('node:fs');
const { createRequire } = require('node:module');

const requireFromReactScripts = createRequire(require.resolve('react-scripts/package.json'));
const file = requireFromReactScripts.resolve('react-dev-utils/checkRequiredFiles');
const source = fs.readFileSync(file, 'utf8');
const deprecatedCall = 'fs.accessSync(filePath, fs.F_OK);';
const supportedCall = 'fs.accessSync(filePath, fs.constants.F_OK);';

// react-dev-utils 12.0.1 still uses the alias deprecated by Node 24.
// Apply the same one-line compatibility fix after every fresh install.
if (source.includes(deprecatedCall)) {
  fs.writeFileSync(file, source.replace(deprecatedCall, supportedCall));
  console.log('Updated react-dev-utils to use fs.constants.F_OK.');
} else if (!source.includes(supportedCall)) {
  throw new Error('react-dev-utils changed; review scripts/patch-build-tools.cjs before building.');
}

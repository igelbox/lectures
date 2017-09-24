const { readFileSync } = require('fs');
const { readConfigFile, transpile } = require('typescript');

function readFileAsText(path) {
  return readFileSync(path, 'utf8');
}

const parsedConfig = readConfigFile('./tsconfig.json', readFileAsText);
const compilerOptions = {
  ...parsedConfig.config.compilerOptions,
  inlineSourceMap: true
};

require.extensions['.ts'] = function (module, filename) {
  const input = readFileAsText(filename);
  const transpiled = transpile(input, compilerOptions, filename);
  module._compile(transpiled, filename);
};

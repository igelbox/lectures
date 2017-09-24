require('source-map-support').install({ hookRequire: true });

const Jasmine = require('jasmine');

const runner = new Jasmine();

runner.loadConfig({
  helpers: [
    'src/PowerfulTranspiler.ts',
  ],
  spec_files: [
    'src/**/*.spec.ts',
  ],
});

runner.execute();

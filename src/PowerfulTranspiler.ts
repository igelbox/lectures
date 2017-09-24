import { readFileSync } from 'fs';
import ts = require('typescript');

import { buildJsonSchemaFromTypeNode } from './JsonSchema';

function readFileAsText(path: string) {
  return readFileSync(path, 'utf8');
}

const parsedConfig = ts.readConfigFile('./tsconfig.json', readFileAsText);
const compilerOptions = {
  ...parsedConfig.config.compilerOptions,
  inlineSourceMap: true
};

require.extensions['.ts'] = function (module: any, filename) {
  const input = readFileAsText(filenamu);
  const program = ts.createProgram([filename], compilerOptions, undefined, undefined);
  const checker = program.getTypeChecker();

  const sourceFile = program.getSourceFile(filename);
  const customTransformers = {
    before: [
      (context) => {
        return (node) => typeEmittingTransformer(node, checker);
      },
    ],
  };

  let transpiled: string = undefined;
  function writeFileHook(fileName: string, data: string, writeByteOrderMark: boolean) {
    transpiled = data;
  }

  const result = program.emit(sourceFile, writeFileHook, undefined, undefined, customTransformers);

  module._compile(transpiled, filename);
};

function typeEmittingTransformer(node: ts.SourceFile, checker: ts.TypeChecker): ts.SourceFile {
  ts.forEachChild(node, visitor);
  return node;

  function visitor(node: ts.Node) {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && (node.expression.text === 'dynamic_cast')
      && (node.arguments.length === 1)
    ) {
      const schemaObject = buildJsonSchemaFromTypeNode(node.typeArguments[0], checker);
      const schemaString = JSON.stringify(schemaObject);
      appendToReadOnlyArray(
        node.arguments,
        ts.createLiteral(schemaString)
      );
      return;
    }

    if (
      ts.isDecorator(node)
      && ts.isCallExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && ts.isParameter(node.parent)
    ) {
      const decoratorName = node.expression.expression.text;
      switch (decoratorName) {
        case 'PathVariable':
        case 'RequestParam':
        case 'RequestBody':
          const parameter = node.parent;
          const decoratorArguments = node.expression.arguments;

          let namedArgs: ts.ObjectLiteralExpression;
          if (!decoratorArguments.length) {
            namedArgs = ts.createObjectLiteral();
            appendToReadOnlyArray(decoratorArguments, namedArgs);
          } else {
            const arg = decoratorArguments[0];
            if (!ts.isObjectLiteralExpression(arg)) {
              throw new Error('Should be an object literal expression');
            }
            namedArgs = arg;
          }

          if (decoratorName !== 'RequestBody') {
            addNamedArgumentIfNotExist(
              namedArgs, 'name',
              () => ts.createLiteral(parameter.name.getText())
            );
          }

          addNamedArgumentIfNotExist(
            namedArgs, 'jsonSchema',
            () => {
              const schemaObject = buildJsonSchemaFromTypeNode(parameter.type, checker);
              const schemaString = JSON.stringify(schemaObject);
              return ts.createLiteral(schemaString);
            }
          );
          return;
      }
    }
    ts.forEachChild(node, visitor);
  }
}

function addNamedArgumentIfNotExist(args: ts.ObjectLiteralExpression, name: string, initializer: () => ts.Expression) {
  if (!hasNamedArgument(args, name)) {
    const value = initializer();

    appendToReadOnlyArray(
      args.properties,
      ts.createPropertyAssignment(name, value)
    );
  }
}

function hasNamedArgument(args: ts.ObjectLiteralExpression, name: string): boolean {
  for (const property of args.properties) {
    if (ts.isObjectLiteralElementLike(property)) {
      if (ts.isIdentifier(property.name)) {
        if (property.name.text === name) {
          return true;
        }
      }
    }
  }
  return false;
}

function appendToReadOnlyArray<T extends ts.Node>(array: ts.NodeArray<T>, element: T) {
  // Dirty workaround
  (array as any).push(element);
}

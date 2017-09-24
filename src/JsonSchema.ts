import ts = require('typescript');

type Dictionary<T> = {
  [key: string]: T;
}

export function buildJsonSchemaFromTypeNode(node: ts.TypeNode, checker: ts.TypeChecker): object {
  if (!node) {
    return { additionalItems: true }; // Allow all types
  }

  if (ts.isArrayTypeNode(node)) {
    return {
      items: buildJsonSchemaFromTypeNode(node.elementType, checker),
      additionalItems: true,
    };
  }

  if (ts.isTypeReferenceNode(node)) {
    const type = checker.getTypeAtLocation(node.typeName);
    return typeToJsonSchema(type, checker, /*node.typeName.text = 'integer'*/);
  }

  if (ts.isUnionTypeNode(node)) {
    const values = [];
    for (const type of node.types) {
      assert(type.kind === ts.SyntaxKind.LiteralType);
      values.push(((type as ts.LiteralTypeNode).literal as any).text);
    }
    return { enum: values };
  }

  if (ts.isTypeLiteralNode(node)) {
    const properties: Dictionary<object> = {}, required = [];
    for (const member of node.members) {
      assert(member.kind === ts.SyntaxKind.PropertySignature);
      const sign = member as ts.PropertySignature;
      if (member.name && sign.type) {
        const key: string = member.name.getText();
        properties[key] = buildJsonSchemaFromTypeNode(sign.type, checker);
        if (!((sign as any).symbol.flags & ts.SymbolFlags.Optional)) {
          required.push(key);
        }
      }
    }
    return {
      properties,
      required,
      additionalProperties: false,
    };
  }
  switch (node.kind) {
    case ts.SyntaxKind.NumberKeyword:
      return { type: 'number' };
    case ts.SyntaxKind.StringKeyword:
      return { type: 'string' };
    case ts.SyntaxKind.BooleanKeyword:
      return { type: 'boolean' };
    default:
      throw new Error(`Unsupported node kind: ${node.kind}`);
  }
}

function typeToJsonSchema(type: ts.Type, checker: ts.TypeChecker): object {
  if (type.flags & ts.TypeFlags.Object) {
    const properties: Dictionary<object> = {}, required = [];
    for (const prop of checker.getPropertiesOfType(type)) {
      if (prop.valueDeclaration) {
        properties[prop.name] = buildJsonSchemaFromTypeNode((prop.valueDeclaration as any).type, checker);
        if (!(prop.flags & ts.SymbolFlags.Optional)) {
          required.push(prop.name);
        }
      }
    }
    return { properties, required, additionalProperties: false };
  }
  if (type.flags & ts.TypeFlags.Union) {
    const values = [];
    for (const t of (<ts.UnionType>type).types) {
      assert(t.flags & ts.TypeFlags.StringLiteral);
      values.push((<ts.StringLiteralType>t).value);
    }
    return { enum: values };
  }
  if (type.flags & ts.TypeFlags.StringLiteral) {
    return { const: (<ts.StringLiteralType>type).value };
  }
  if (type.flags & ts.TypeFlags.String) {
    return { type: 'string' };
  }
  if (type.flags & ts.TypeFlags.Number) {
    return { type: 'number' };
  }
  if (type.flags & ts.TypeFlags.Boolean) {
    return { type: 'boolean' };
  }
  throw new Error(`Unsupported type flags: ${type.flags}`);
}

function assert(condition: any, message?: string): void | never {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

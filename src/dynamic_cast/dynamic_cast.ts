import Ajv = require('ajv');

const ajv = new Ajv();

export default function dynamic_cast<T>(value: any, schema?: string): T {
  if (!schema) {
    throw new Error('Schema is not specified');
  }

  if (!ajv.validate(JSON.parse(schema), value)) {
    throw new Error(ajv.errors[0].message);
  }

  return value as T;
}

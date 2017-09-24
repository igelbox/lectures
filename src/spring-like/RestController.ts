import bodyParser = require('body-parser');
import express = require('express');
import Ajv = require('ajv');

type ControllerConstructor = {
  new(): Object;
};
type ControllerArguments = {
  path: string;
};
type MappingArguments = {
  method: 'GET' | 'POST';
  path?: string;
};

export function RestController(args: ControllerArguments) {
  return (constructor: ControllerConstructor) => {
    const controller = definitionForConstructor(constructor);
    controller.args = args;
  };
}

export function RequestMapping(args: MappingArguments) {
  return (target: Object, propertyKey: string, descriptor: PropertyDescriptor) => {
    const method = definitionForMethod(target.constructor, propertyKey);
    method.args = args;
  };
}

export function RequestBody(args?: {
  jsonSchema?: string;
}) {
  return buildParameterDecorator(args.jsonSchema, 'validate', 'body', req => req.body);
}

export function PathVariable(args?: {
  name?: string;
  jsonSchema?: string;
}) {
  return buildParameterDecorator(args.jsonSchema, 'convert', args.name, req => req.params[args.name]);
}

export function RequestParam(args?: {
  name?: string;
  jsonSchema?: string;
}) {
  return buildParameterDecorator(args.jsonSchema, 'convert', args.name, req => req.query[args.name]);
}


export function createApplication(): express.Application {
  const app = express();
  app.use(bodyParser.json());

  for (const [constructor, controller] of globalControllersMap) {
    const router = express.Router();

    const instance = new constructor();
    for (const [methodName, methodDescriptor] of controller.methods) {
      const httpMethod = methodDescriptor.args.method;
      const path = convertPathSpringToExpress(methodDescriptor.args.path || '/');

      router[httpMethod.toLowerCase()](path, (req: express.Request, res: express.Response) => {
        handleMethod(req, res, instance, methodName, methodDescriptor);
      });
    }
    app.use(controller.args.path, router);
  }
  return app;
}

// IMPLEMENTATION

type ControllerDefinition = {
  args?: ControllerArguments;
  methods: Map<string, MethodDefinition>;
};
type MethodDefinition = {
  args?: MappingArguments;
  argumentsValueGetters: MethodArgValueGetter[];
};
type MethodArgValueGetter = (req: express.Request) => any;

const globalControllersMap: Map<ControllerConstructor, ControllerDefinition> = new Map();

function definitionForConstructor(constructor: ControllerConstructor): ControllerDefinition {
  let result = globalControllersMap.get(constructor);
  if (result === undefined) {
    result = {
      methods: new Map<string, MethodDefinition>(),
    };
    globalControllersMap.set(constructor, result);
  }
  return result;
}

function definitionForMethod(constructor: Function, methodName: string): MethodDefinition {
  const controller = definitionForConstructor(constructor as ControllerConstructor);
  let result = controller.methods.get(methodName);
  if (result === undefined) {
    result = {
      argumentsValueGetters: [],
    };
    controller.methods.set(methodName, result);
  }
  return result;
}

const ajv_v = new Ajv();
const ajv_c = new Ajv({ coerceTypes: true });

function buildParameterDecorator(jsonSchema: string, convert: 'convert' | 'validate', name: string, getter: (req: express.Request) => any) {
  if (!jsonSchema) {
    throw new Error('Schema is not specified');
  }
  const ajv = convert == 'convert' ? ajv_c : ajv_v;
  const validate = ajv.compile({
    properties: {
      [name]: JSON.parse(jsonSchema),
    },
  });

  return (target: Object, propertyKey: string, parameterIndex: number) => {
    const method = definitionForMethod(target.constructor, propertyKey);
    method.argumentsValueGetters[parameterIndex] = req => {
      const values = {
        [name]: getter(req),
      };
      if (!validate(values)) {
        throw new Error(validate.errors[0].message);
      }
      return values[name];
    };
  };
}

async function handleMethod(
  req: express.Request, res: express.Response,
  instance: Object, methodName: string,
  methodDescriptor: MethodDefinition
) {
  try {
    const args = methodDescriptor.argumentsValueGetters.map(getter => getter(req));
    const result = await instance[methodName].apply(instance, args);
    res.status(200).send(result);
  } catch (e) {
    res.status(500).send({
      message: e && e.stack || String(e),
    });
  }
}

/**
 * Replaces /abc/{def}/{qwe} to /abc/:def/:qwe
 */
function convertPathSpringToExpress(path: string) {
  return path.replace(/\{([^\}]+)\}/, (_, group) => ':' + group);
}

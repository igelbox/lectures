### Advanced examples for a lecture about integration TypeScript into a JavaScript-based project.

There are two complex examples which require a special/custom version of TypeScript compiler:
1. The `dynamic_cast` example:
```ts
type Struct = {
  a: number,
  b: string[],
  c: 'abc' | 'def',
}

const value: any = {
  a: 123,
  b: [],
  c: 'qwe',
};

const cast = dynamic_cast<Struct>(value); // Will fail with 'should be equal to one of the allowed values' error
```

2. The `Spring-like REST controller` example:
```ts
@RestController({ path: '/api/v1' })
class TestController {
  @RequestMapping({ path: '/{pathVariable}', method: 'POST' })
  request(
    @RequestBody() body: {
      a: number;
      b: string;
      c: number[];
    },
    @PathVariable({}) pathVariable: number,
    @RequestParam() flag: boolean,
  ) {
    return {
      body,
      path: pathVariable,
      flag,
    };
  }
}
```
So, the following request will fail due to all three parameters (path variable, query parameter, and request body) have incompatible types.
```js
POST /api/v1/qwe?flag=rty
{
  a: 1,
  b: 'two',
  c: [1, '2']
}
```

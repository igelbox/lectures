import { agent } from 'supertest';
import {
  RestController,
  RequestMapping,
  RequestBody,
  PathVariable,
  RequestParam,
  createApplication,
} from './RestController';

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

const application = createApplication();
const test = agent(application);

describe('RestController', () => {
  it('should fail with 404', () => {
    return test
      .post('/api')
      .expect(404);
  });

  it('should work well', async () => {
    const data = {
      a: 1,
      b: 'two',
      c: [1, 2],
    };
    const response = await test
      .post('/api/v1/123?flag=true')
      .send(data)
      .expect(200);
    const result = response.body;
    expect(result).toEqual({
      body: data,
      path: 123,
      flag: true,
    });
  });

  it('should fail with body schema mismatch', async () => {
    const response = await test
      .post('/api/v1/123?flag=true')
      .send({
        a: 1,
        b: 'two',
        c: [1, '2'],
      })
      .expect(500);
    const result = response.body;
    expect(result.message).toContain('should be number');
  });

  it('should fail with path type mismatch', async () => {
    const response = await test
      .post('/api/v1/abc?flag=true')
      .send({
        a: 1,
        b: 'two',
        c: [1, 2],
      })
      .expect(500);
    const result = response.body;
    expect(result.message).toContain('should be number');
  });

  it('should fail with query type mismatch', async () => {
    const response = await test
      .post('/api/v1/123?flag=89')
      .send({
        a: 1,
        b: 'two',
        c: [1, 2],
      })
      .expect(500);
    const result = response.body;
    expect(result.message).toContain('should be boolean');
  });
});

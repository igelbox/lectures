import dynamic_cast from './dynamic_cast';

type Struct = {
  a?: number,
  b: string[],
  c: 'abc' | 'def',
};

describe('dynamic_cast', () => {
  it('should pass a compatible primitive type', () => {
    const value = '123';
    const cast: string = dynamic_cast<string>(value);
    expect(cast).toBe(value);
  });

  it('should fail on an incompatible primitive type', () => {
    expect(() => {
      const cast: string = dynamic_cast<string>(123);
    }).toThrowError('should be string');
  });

  it('should pass a compatible complex type', () => {
    const value: any = {
      //a: there is no such key
      b: ['s0', 's1'],
      c: 'def',
    };
    const cast: Struct = dynamic_cast<Struct>(value);
    expect(cast).toBe(value);
  });

  it('should fail on an incompatible (wrong enum value) complex type', () => {
    const value: any = {
      a: 123,
      b: ['s0'],
      c: 'unknown',
    };
    expect(() => {
      const cast: Struct = dynamic_cast<Struct>(value);
    }).toThrowError('should be equal to one of the allowed values');
  });

  it('should fail on an incompatible (required property) complex type', () => {
    const value: any = {
      a: 123,
      c: 'abc',
    };
    expect(() => {
      const cast: Struct = dynamic_cast<Struct>(value);
    }).toThrowError(`should have required property 'b'`);
  });
});

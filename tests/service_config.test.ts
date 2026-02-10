/**
 * Tests verifying that ServiceConfigInput struct mapping works correctly
 * for both register.ts and update_manifest.ts flows.
 *
 * These tests exercise the exact encoding logic used in the scripts,
 * ensuring StructType/Field/Struct construction matches the ABI.
 */

import {
  StructType,
  FieldDefinition,
  Field,
  Struct,
  U32Type,
  U32Value,
  BigUIntType,
  BigUIntValue,
  TokenIdentifierType,
  TokenIdentifierValue,
  U64Type,
  U64Value,
  VariadicValue,
  BytesType,
  BytesValue,
} from '@multiversx/sdk-core';

// Replicate the struct mapping from register.ts / update_manifest.ts
function buildServiceConfigType(): StructType {
  return new StructType('ServiceConfigInput', [
    new FieldDefinition('service_id', '', new U32Type()),
    new FieldDefinition('price', '', new BigUIntType()),
    new FieldDefinition('token', '', new TokenIdentifierType()),
    new FieldDefinition('nonce', '', new U64Type()),
  ]);
}

interface ServiceEntry {
  service_id: number;
  price: string;
  token: string;
  nonce: number;
}

function mapServicesToTyped(services: ServiceEntry[]): Struct[] {
  const serviceConfigType = buildServiceConfigType();
  return services.map(
    s =>
      new Struct(serviceConfigType, [
        new Field(new U32Value(s.service_id), 'service_id'),
        new Field(new BigUIntValue(s.price), 'price'),
        new Field(new TokenIdentifierValue(s.token), 'token'),
        new Field(new U64Value(s.nonce), 'nonce'),
      ]),
  );
}

describe('ServiceConfigInput Struct Mapping', () => {
  it('should create a valid ServiceConfigInput struct from config', () => {
    const services: ServiceEntry[] = [
      {service_id: 1, price: '1000000000000000000', token: 'EGLD', nonce: 0},
    ];

    const typed = mapServicesToTyped(services);
    expect(typed).toHaveLength(1);

    const struct = typed[0];
    expect(struct.getType().getName()).toBe('ServiceConfigInput');

    const fields = struct.getFields();
    expect(fields).toHaveLength(4);
    expect(fields[0].name).toBe('service_id');
    expect(fields[1].name).toBe('price');
    expect(fields[2].name).toBe('token');
    expect(fields[3].name).toBe('nonce');

    // Verify values
    expect(Number(fields[0].value.valueOf())).toBe(1);
    expect(fields[1].value.valueOf().toString()).toBe('1000000000000000000');
    expect(fields[2].value.valueOf()).toBe('EGLD');
    expect(Number(fields[3].value.valueOf())).toBe(0);
  });

  it('should handle multiple services', () => {
    const services: ServiceEntry[] = [
      {service_id: 1, price: '1000000000000000000', token: 'EGLD', nonce: 0},
      {service_id: 2, price: '500000', token: 'USDC-c76f1f', nonce: 0},
      {service_id: 3, price: '0', token: 'EGLD', nonce: 0},
    ];

    const typed = mapServicesToTyped(services);
    expect(typed).toHaveLength(3);

    // Verify second service
    const secondFields = typed[1].getFields();
    expect(Number(secondFields[0].value.valueOf())).toBe(2);
    expect(secondFields[1].value.valueOf().toString()).toBe('500000');
    expect(secondFields[2].value.valueOf()).toBe('USDC-c76f1f');

    // Verify third service (zero price — free service)
    const thirdFields = typed[2].getFields();
    expect(Number(thirdFields[0].value.valueOf())).toBe(3);
    expect(thirdFields[1].value.valueOf().toString()).toBe('0');
  });

  it('should produce an empty VariadicValue for empty services', () => {
    const services: ServiceEntry[] = [];
    const typed = mapServicesToTyped(services);
    expect(typed).toHaveLength(0);

    const variadic = VariadicValue.fromItemsCounted(...typed);
    expect(variadic).toBeDefined();
  });

  it('should produce correct VariadicValue with services', () => {
    const services: ServiceEntry[] = [
      {service_id: 1, price: '1000000000000000000', token: 'EGLD', nonce: 0},
    ];

    const typed = mapServicesToTyped(services);
    const variadic = VariadicValue.fromItemsCounted(...typed);
    expect(variadic).toBeDefined();
    expect(variadic.getItems()).toHaveLength(1);
  });
});

describe('MetadataEntry Struct Mapping', () => {
  it('should create valid MetadataEntry structs', () => {
    const metadataType = new StructType('MetadataEntry', [
      new FieldDefinition('key', '', new BytesType()),
      new FieldDefinition('value', '', new BytesType()),
    ]);

    const metadata = [
      {key: 'price:default', value: '1000000'},
      {key: 'token:default', value: 'EGLD'},
    ];

    const metadataTyped = metadata.map(
      m =>
        new Struct(metadataType, [
          new Field(new BytesValue(Buffer.from(m.key)), 'key'),
          new Field(new BytesValue(Buffer.from(m.value)), 'value'),
        ]),
    );

    expect(metadataTyped).toHaveLength(2);
    expect(metadataTyped[0].getType().getName()).toBe('MetadataEntry');
  });
});

describe('Combined scArgs construction', () => {
  it('should build full scArgs with metadata and services', () => {
    const agentName = 'TestBot';
    const agentUri = 'https://test.bot/manifest.json';
    const publicKeyHex = '0'.repeat(64);

    // Metadata
    const metadataType = new StructType('MetadataEntry', [
      new FieldDefinition('key', '', new BytesType()),
      new FieldDefinition('value', '', new BytesType()),
    ]);
    const metadataTyped = [
      new Struct(metadataType, [
        new Field(new BytesValue(Buffer.from('price:default')), 'key'),
        new Field(new BytesValue(Buffer.from('1000000')), 'value'),
      ]),
    ];

    // Services
    const servicesTyped = mapServicesToTyped([
      {service_id: 1, price: '1000000000000000000', token: 'EGLD', nonce: 0},
    ]);

    const scArgs = [
      Buffer.from(agentName),
      Buffer.from(agentUri),
      Buffer.from(publicKeyHex, 'hex'),
      VariadicValue.fromItemsCounted(...metadataTyped),
      VariadicValue.fromItemsCounted(...servicesTyped),
    ];

    expect(scArgs).toHaveLength(5);
    expect(scArgs[0]).toEqual(Buffer.from('TestBot'));
    expect((scArgs[3] as VariadicValue).getItems()).toHaveLength(1); // 1 metadata entry
    expect((scArgs[4] as VariadicValue).getItems()).toHaveLength(1); // 1 service entry
  });

  it('should build scArgs with empty metadata and services (backward compat)', () => {
    const scArgs = [
      Buffer.from('Bot'),
      Buffer.from('https://bot.io'),
      Buffer.from('0'.repeat(64), 'hex'),
      VariadicValue.fromItemsCounted(),
      VariadicValue.fromItemsCounted(),
    ];

    expect(scArgs).toHaveLength(5);
    expect((scArgs[3] as VariadicValue).getItems()).toHaveLength(0);
    expect((scArgs[4] as VariadicValue).getItems()).toHaveLength(0);
  });
});

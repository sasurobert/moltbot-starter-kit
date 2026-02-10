"use strict";
/**
 * Tests verifying that ServiceConfigInput struct mapping works correctly
 * for both register.ts and update_manifest.ts flows.
 *
 * These tests exercise the exact encoding logic used in the scripts,
 * ensuring StructType/Field/Struct construction matches the ABI.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_core_1 = require("@multiversx/sdk-core");
// Replicate the struct mapping from register.ts / update_manifest.ts
function buildServiceConfigType() {
    return new sdk_core_1.StructType('ServiceConfigInput', [
        new sdk_core_1.FieldDefinition('service_id', '', new sdk_core_1.U32Type()),
        new sdk_core_1.FieldDefinition('price', '', new sdk_core_1.BigUIntType()),
        new sdk_core_1.FieldDefinition('token', '', new sdk_core_1.TokenIdentifierType()),
        new sdk_core_1.FieldDefinition('nonce', '', new sdk_core_1.U64Type()),
    ]);
}
function mapServicesToTyped(services) {
    const serviceConfigType = buildServiceConfigType();
    return services.map(s => new sdk_core_1.Struct(serviceConfigType, [
        new sdk_core_1.Field(new sdk_core_1.U32Value(s.service_id), 'service_id'),
        new sdk_core_1.Field(new sdk_core_1.BigUIntValue(s.price), 'price'),
        new sdk_core_1.Field(new sdk_core_1.TokenIdentifierValue(s.token), 'token'),
        new sdk_core_1.Field(new sdk_core_1.U64Value(s.nonce), 'nonce'),
    ]));
}
describe('ServiceConfigInput Struct Mapping', () => {
    it('should create a valid ServiceConfigInput struct from config', () => {
        const services = [
            { service_id: 1, price: '1000000000000000000', token: 'EGLD', nonce: 0 },
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
        const services = [
            { service_id: 1, price: '1000000000000000000', token: 'EGLD', nonce: 0 },
            { service_id: 2, price: '500000', token: 'USDC-c76f1f', nonce: 0 },
            { service_id: 3, price: '0', token: 'EGLD', nonce: 0 },
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
        const services = [];
        const typed = mapServicesToTyped(services);
        expect(typed).toHaveLength(0);
        const variadic = sdk_core_1.VariadicValue.fromItemsCounted(...typed);
        expect(variadic).toBeDefined();
    });
    it('should produce correct VariadicValue with services', () => {
        const services = [
            { service_id: 1, price: '1000000000000000000', token: 'EGLD', nonce: 0 },
        ];
        const typed = mapServicesToTyped(services);
        const variadic = sdk_core_1.VariadicValue.fromItemsCounted(...typed);
        expect(variadic).toBeDefined();
        expect(variadic.getItems()).toHaveLength(1);
    });
});
describe('MetadataEntry Struct Mapping', () => {
    it('should create valid MetadataEntry structs', () => {
        const metadataType = new sdk_core_1.StructType('MetadataEntry', [
            new sdk_core_1.FieldDefinition('key', '', new sdk_core_1.BytesType()),
            new sdk_core_1.FieldDefinition('value', '', new sdk_core_1.BytesType()),
        ]);
        const metadata = [
            { key: 'price:default', value: '1000000' },
            { key: 'token:default', value: 'EGLD' },
        ];
        const metadataTyped = metadata.map(m => new sdk_core_1.Struct(metadataType, [
            new sdk_core_1.Field(new sdk_core_1.BytesValue(Buffer.from(m.key)), 'key'),
            new sdk_core_1.Field(new sdk_core_1.BytesValue(Buffer.from(m.value)), 'value'),
        ]));
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
        const metadataType = new sdk_core_1.StructType('MetadataEntry', [
            new sdk_core_1.FieldDefinition('key', '', new sdk_core_1.BytesType()),
            new sdk_core_1.FieldDefinition('value', '', new sdk_core_1.BytesType()),
        ]);
        const metadataTyped = [
            new sdk_core_1.Struct(metadataType, [
                new sdk_core_1.Field(new sdk_core_1.BytesValue(Buffer.from('price:default')), 'key'),
                new sdk_core_1.Field(new sdk_core_1.BytesValue(Buffer.from('1000000')), 'value'),
            ]),
        ];
        // Services
        const servicesTyped = mapServicesToTyped([
            { service_id: 1, price: '1000000000000000000', token: 'EGLD', nonce: 0 },
        ]);
        const scArgs = [
            Buffer.from(agentName),
            Buffer.from(agentUri),
            Buffer.from(publicKeyHex, 'hex'),
            sdk_core_1.VariadicValue.fromItemsCounted(...metadataTyped),
            sdk_core_1.VariadicValue.fromItemsCounted(...servicesTyped),
        ];
        expect(scArgs).toHaveLength(5);
        expect(scArgs[0]).toEqual(Buffer.from('TestBot'));
        expect(scArgs[3].getItems()).toHaveLength(1); // 1 metadata entry
        expect(scArgs[4].getItems()).toHaveLength(1); // 1 service entry
    });
    it('should build scArgs with empty metadata and services (backward compat)', () => {
        const scArgs = [
            Buffer.from('Bot'),
            Buffer.from('https://bot.io'),
            Buffer.from('0'.repeat(64), 'hex'),
            sdk_core_1.VariadicValue.fromItemsCounted(),
            sdk_core_1.VariadicValue.fromItemsCounted(),
        ];
        expect(scArgs).toHaveLength(5);
        expect(scArgs[3].getItems()).toHaveLength(0);
        expect(scArgs[4].getItems()).toHaveLength(0);
    });
});
//# sourceMappingURL=service_config.test.js.map
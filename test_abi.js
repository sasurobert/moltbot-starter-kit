const { Abi } = require('@multiversx/sdk-core');
const fs = require('fs');

const rawAbi = fs.readFileSync('identity-registry.abi.json', 'utf8')
    .replace(/"TokenId"/g, '"TokenIdentifier"')
    .replace(/"NonZeroBigUint"/g, '"BigUint"');
const abiJson = JSON.parse(rawAbi);

console.log("--- Testing Endpoints ---");
for (const endpoint of abiJson.endpoints) {
    try {
        const dummyAbi = {
            name: "Test",
            endpoints: [endpoint],
            types: abiJson.types
        };
        Abi.create(dummyAbi);
        // console.log(`✓ Endpoint ${endpoint.name} OK`);
    } catch (e) {
        console.error(`✗ Endpoint ${endpoint.name} FAILED:`, e.message);
        // Break down inputs
        for (const input of endpoint.inputs) {
            try {
                 const dummyAbiInput = {
                    name: "Test",
                    endpoints: [{ name: "test", inputs: [input], outputs: [] }],
                    types: abiJson.types
                };
                Abi.create(dummyAbiInput);
            } catch (e2) {
                console.error(`  -> Input ${input.name} (${input.type}) FAILED:`, e2.message);
            }
        }
        // Break down outputs
        for (const output of endpoint.outputs) {
             try {
                 const dummyAbiOutput = {
                    name: "Test",
                    endpoints: [{ name: "test", inputs: [], outputs: [output] }],
                    types: abiJson.types
                };
                Abi.create(dummyAbiOutput);
            } catch (e2) {
                console.error(`  -> Output (${output.type}) FAILED:`, e2.message);
            }
        }
    }
}

console.log("--- Testing Types ---");
for (const [typeName, typeDef] of Object.entries(abiJson.types)) {
    try {
        const dummyAbiType = {
            name: "Test",
            endpoints: [],
            types: { [typeName]: typeDef }
        };
        // This might not fail alone if it's not used, so we force-map it if we can find a way, 
        // or just rely on the endpoint test above.
    } catch (e) {
        console.error(`✗ Type ${typeName} FAILED:`, e.message);
    }
}

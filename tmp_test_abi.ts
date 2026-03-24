import { Abi } from "@multiversx/sdk-core";
import { promises as fs } from "fs";
import * as path from "path";

async function main() {
    const abiPath = path.resolve(__dirname, "identity-registry.abi.json");
    const rawAbiStr = await fs.readFile(abiPath, "utf8");
    const abiJson = JSON.parse(rawAbiStr);
    
    console.log("Attempting to create Abi object...");
    try {
        let abiStr = rawAbiStr;
        
        // Patching the ABI because sdk-core v15 does not support newer framework types
        abiStr = abiStr.replace(/\bTokenId\b/g, 'TokenIdentifier');
        abiStr = abiStr.replace(/\bNonZeroBigUint\b/g, 'BigUint');
        abiStr = abiStr.replace(/\bcounted-variadic\b/g, 'variadic');
        
        // Handle List<T> syntax which might not be supported in v15
        abiStr = abiStr.replace(/\bList</g, 'variadic<');

        // Payment is used in some endpoints but might be missing from the types section
        // or the SDK doesn't recognize it as a framework type. 
        // We map it to EgldOrEsdtTokenPayment which has the same structure.
        abiStr = abiStr.replace(/\bPayment\b/g, 'EgldOrEsdtTokenPayment');

        const abi = Abi.create(JSON.parse(abiStr));
        console.log("✅ Successfully created Abi object after patching.");
        
        // Log all custom types
        console.log("Custom Types found in ABI:");
        const types = (abi as any).customTypes || (abi as any).types || [];
        if (Array.isArray(types)) {
            types.forEach((t: any) => {
                 console.log(` - ${t.getName ? t.getName() : t.name}`);
            });
        }

    } catch (e: any) {
        console.error("❌ Failed to create Abi object:");
        console.error("Message:", e.message);
        if (e.stack) console.error("Stack:", e.stack);
    }
}

main().catch(console.error);

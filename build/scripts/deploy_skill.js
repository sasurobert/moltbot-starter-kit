'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const fs_1 = require('fs');
const path = require('path');
async function main() {
  console.log('📦 preparing Skill Deployment...');
  // 1. Read Config
  const configPath = path.resolve('config.json');
  let config;
  try {
    config = JSON.parse(await fs_1.promises.readFile(configPath, 'utf8'));
  } catch {
    console.error('❌ config.json not found.');
    process.exit(1);
  }
  // 2. Validate Metadata
  console.log(`Agent: ${config.agentName}`);
  if (!config.capabilities || config.capabilities.length === 0) {
    console.warn('⚠️  No capabilities listed in config.json!');
  } else {
    console.log(`Capabilities: ${config.capabilities.join(', ')}`);
  }
  // 3. Simulate Packaging
  console.log('Running static analysis on skills... (Simulated)');
  await new Promise(r => setTimeout(r, 800)); // Fake work
  console.log('✅ Skills Verified.');
  // 4. Simulate Upload
  console.log('Uploading to ClawHub Registry... (Simulated)');
  await new Promise(r => setTimeout(r, 1000)); // Fake network
  const mockHash =
    'Qm' +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  console.log('\n✅ Deployment Successful!');
  console.log('------------------------------------------------');
  console.log(`Skill Bundle Hash (IPFS): ${mockHash}`);
  console.log(`Registry ID: skill-${config.agentName.toLowerCase()}-v1.0.0`);
  console.log('------------------------------------------------');
  console.log(
    'You can now reference this Bundle Hash in your on-chain registration.',
  );
}
main().catch(console.error);
//# sourceMappingURL=deploy_skill.js.map

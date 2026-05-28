import * as path from 'path';
import {pullClawHubSkill} from '../src/skills/clawhub_skills';

interface CliOptions {
  slug?: string;
  version?: string;
  outputDir?: string;
  registryBaseUrl?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    registryBaseUrl: process.env.CLAWHUB_REGISTRY,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      console.error(`Missing value for ${arg}`);
      process.exit(1);
    }

    if (arg === '--slug') options.slug = next;
    if (arg === '--version') options.version = next;
    if (arg === '--out-dir') options.outputDir = next;
    if (arg === '--registry') options.registryBaseUrl = next;
    i++;
  }

  return options;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.slug?.trim()) {
    console.error('Missing required --slug argument');
    process.exit(1);
  }

  const result = await pullClawHubSkill({
    slug: opts.slug,
    version: opts.version,
    outputDir: opts.outputDir,
    registryBaseUrl: opts.registryBaseUrl,
  });

  console.log('Skill pull successful.');
  console.log('------------------------------------------------');
  console.log(`Slug: ${result.slug}`);
  console.log(`Version: ${result.version}`);
  console.log(`Saved to: ${path.resolve(result.outputPath)}`);
  console.log(`Size: ${result.sizeBytes} bytes`);
  console.log('------------------------------------------------');
}

main().catch(error => {
  console.error('Failed to pull skill:', error);
  process.exit(1);
});

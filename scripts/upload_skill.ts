import {promises as fs} from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface AgentConfig {
  agentName?: string;
  metadata?: Array<{key?: string; value?: string}>;
}

interface CliOptions {
  skillPath: string;
  slug?: string;
  name?: string;
  version?: string;
  changelog: string;
  tags: string[];
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    skillPath: process.env.CLAWHUB_SKILL_PATH || '.',
    slug: process.env.CLAWHUB_SLUG,
    name: process.env.CLAWHUB_NAME,
    version: process.env.CLAWHUB_VERSION,
    changelog: process.env.CLAWHUB_CHANGELOG || '',
    tags: (process.env.CLAWHUB_TAGS || 'latest')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean),
    dryRun: process.env.CLAWHUB_DRY_RUN === 'true',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (!arg.startsWith('--')) continue;
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      console.error(`Missing value for ${arg}`);
      process.exit(1);
    }

    if (arg === '--path') options.skillPath = next;
    if (arg === '--slug') options.slug = next;
    if (arg === '--name') options.name = next;
    if (arg === '--version') options.version = next;
    if (arg === '--changelog') options.changelog = next;
    if (arg === '--tags') {
      options.tags = next
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
    }
    i++;
  }

  return options;
}

async function safeReadAgentConfig(): Promise<AgentConfig> {
  const configPath = path.resolve('agent.config.json');
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    return JSON.parse(raw) as AgentConfig;
  } catch {
    return {};
  }
}

function inferVersionFromMetadata(config: AgentConfig): string | undefined {
  const entry = config.metadata?.find(m => m.key === 'version');
  return entry?.value;
}

async function collectFilesRecursive(baseDir: string): Promise<string[]> {
  const items = await fs.readdir(baseDir, {withFileTypes: true});
  const files: string[] = [];

  for (const item of items) {
    if (item.name === '.git' || item.name === 'node_modules') continue;
    const full = path.join(baseDir, item.name);
    if (item.isDirectory()) {
      files.push(...(await collectFilesRecursive(full)));
    } else if (item.isFile()) {
      files.push(full);
    }
  }

  return files;
}

async function main(): Promise<void> {
  console.log('Preparing Skill Upload...');

  const opts = parseArgs(process.argv.slice(2));
  const apiBase =
    process.env.CLAWHUB_REGISTRY?.replace(/\/+$/, '') || 'https://clawhub.ai';
  const token = process.env.CLAWHUB_TOKEN;

  const skillPath = path.resolve(opts.skillPath);
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  try {
    await fs.access(skillMdPath);
  } catch {
    console.error(`SKILL.md not found in: ${skillPath}`);
    process.exit(1);
  }

  const config = await safeReadAgentConfig();
  const slug = (opts.slug || config.agentName || '').trim().toLowerCase();
  const displayName = (opts.name || config.agentName || '').trim();
  const version = (
    opts.version ||
    inferVersionFromMetadata(config) ||
    '1.0.0'
  ).trim();

  if (!slug) {
    console.error('Missing skill slug. Use --slug or set CLAWHUB_SLUG.');
    process.exit(1);
  }
  if (!displayName) {
    console.error('Missing display name. Use --name or set CLAWHUB_NAME.');
    process.exit(1);
  }

  const files = await collectFilesRecursive(skillPath);
  if (files.length === 0) {
    console.error(`No files found in skill path: ${skillPath}`);
    process.exit(1);
  }

  const form = new FormData();
  form.append(
    'payload',
    JSON.stringify({
      slug,
      displayName,
      version,
      changelog: opts.changelog,
      acceptLicenseTerms: true,
      tags: opts.tags.length > 0 ? opts.tags : ['latest'],
    }),
  );

  for (const filePath of files) {
    const relPath = path
      .relative(skillPath, filePath)
      .split(path.sep)
      .join('/');
    const content = await fs.readFile(filePath);
    form.append('files', new Blob([content]), relPath);
  }

  if (opts.dryRun) {
    console.log('Dry run enabled. Skipping ClawHub upload request.');
    console.log('------------------------------------------------');
    console.log(`Registry: ${apiBase}`);
    console.log(`Skill path: ${skillPath}`);
    console.log(`Slug: ${slug}`);
    console.log(`Name: ${displayName}`);
    console.log(`Version: ${version}`);
    console.log(
      `Tags: ${(opts.tags.length > 0 ? opts.tags : ['latest']).join(', ')}`,
    );
    console.log(`Files prepared: ${files.length}`);
    console.log('------------------------------------------------');
    return;
  }

  if (!token) {
    console.error('Missing CLAWHUB_TOKEN in environment/.env');
    process.exit(1);
  }

  console.log(`Uploading ${files.length} file(s) to ClawHub...`);
  const response = await fetch(`${apiBase}/api/v1/skills`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: form,
  });

  const responseText = await response.text();
  let parsedResponse: unknown = responseText;
  try {
    parsedResponse = JSON.parse(responseText);
  } catch {
    console.error('Failed to parse response as JSON:', responseText);
    process.exit(1);
  }

  if (!response.ok) {
    console.error('ClawHub upload failed.');
    console.error(`   HTTP ${response.status}`);
    console.error('   Response:', parsedResponse);
    process.exit(1);
  }

  console.log('\nUpload successful!');
  console.log('------------------------------------------------');
  console.log(`Registry: ${apiBase}`);
  console.log(`Slug: ${slug}`);
  console.log(`Version: ${version}`);
  console.log('Response:', parsedResponse);
  console.log('------------------------------------------------');
}

main().catch(error => {
  console.error('Fatal upload error:', error);
  process.exit(1);
});

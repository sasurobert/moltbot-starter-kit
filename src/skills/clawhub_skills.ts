/**
 * ClawHub Skills — pull published skills from ClawHub.
 *
 * Downloads a skill archive (zip) from the public registry and stores it
 * locally for inspection or offline use.
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import {Logger} from '../utils/logger';

const logger = new Logger('ClawHubSkills');

interface ClawHubSkillMetaResponse {
  latestVersion?: {
    version?: string;
  };
}

export interface PullClawHubSkillParams {
  slug: string;
  version?: string;
  outputDir?: string;
  registryBaseUrl?: string;
}

export interface PullClawHubSkillResult {
  slug: string;
  version: string;
  outputPath: string;
  sizeBytes: number;
}

async function resolveVersion(
  baseUrl: string,
  slug: string,
  explicitVersion?: string,
): Promise<string> {
  if (explicitVersion) return explicitVersion;

  const response = await fetch(`${baseUrl}/api/v1/skills/${slug}`, {
    method: 'GET',
    headers: {Accept: 'application/json'},
  });

  if (!response.ok) {
    throw new Error(
      `Failed to resolve latest version for "${slug}" (HTTP ${response.status})`,
    );
  }

  const body = (await response.json()) as ClawHubSkillMetaResponse;
  const latest = body.latestVersion?.version;
  if (!latest) {
    throw new Error(`Skill "${slug}" has no latestVersion in API response`);
  }
  return latest;
}

export async function pullClawHubSkill(
  params: PullClawHubSkillParams,
): Promise<PullClawHubSkillResult> {
  if (!params.slug?.trim()) {
    throw new Error('slug is required');
  }

  const slug = params.slug.trim().toLowerCase();
  const baseUrl = (params.registryBaseUrl || 'https://clawhub.ai').replace(
    /\/+$/,
    '',
  );
  const outputDir = path.resolve(params.outputDir || 'downloads/clawhub');

  const version = await resolveVersion(baseUrl, slug, params.version);
  const query = new URLSearchParams({slug, version});
  const downloadUrl = `${baseUrl}/api/v1/download?${query.toString()}`;

  logger.info(`Downloading ${slug}@${version} from ClawHub...`);

  const response = await fetch(downloadUrl, {
    method: 'GET',
    headers: {Accept: 'application/zip'},
  });
  if (!response.ok) {
    throw new Error(
      `Failed to download "${slug}@${version}" (HTTP ${response.status})`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const data = Buffer.from(arrayBuffer);
  if (data.length === 0) {
    throw new Error(`Download returned empty archive for "${slug}@${version}"`);
  }

  await fs.mkdir(outputDir, {recursive: true});
  const fileName = `${slug}-${version}.zip`;
  const outputPath = path.join(outputDir, fileName);
  await fs.writeFile(outputPath, data);

  logger.info(`Saved archive to ${outputPath}`, {sizeBytes: data.length});

  return {
    slug,
    version,
    outputPath,
    sizeBytes: data.length,
  };
}

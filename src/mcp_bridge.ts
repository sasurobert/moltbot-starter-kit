import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {CONFIG} from './config';
import {Logger} from './utils/logger';

export type McpTransportType = 'http' | 'stdio';

export interface McpBridgeOptions {
  transport?: McpTransportType;
  httpUrl?: string;
  stdioCommand?: string;
  stdioArgs?: string[];
}

/** Remote MCP tool names (MultiversX MCP server convention). */
const TOOL_GET_AGENT_REPUTATION = 'get_agent_reputation';
const TOOL_GET_GAS_PRICE = 'get_gas_price';

const DEFAULT_REPUTATION = 50;
const DEFAULT_GAS_PRICE = '1000000000';
const DEFAULT_STDIO_COMMAND = 'npx';
const DEFAULT_STDIO_ARGS = ['-y', '@multiversx/mcp-server'];
const DEFAULT_RETRY_DELAY_MS = 200;
const DEFAULT_MCP_MAX_ATTEMPTS = 3;

export class McpBridge {
  private readonly options: McpBridgeOptions;

  private client: Client | null = null;

  private transport:
    | StreamableHTTPClientTransport
    | StdioClientTransport
    | null = null;

  private connectPromise: Promise<Client> | null = null;

  private closed = false;

  private logger = new Logger('McpBridge');

  /**
   * @param urlOrOptions HTTP base URL (legacy) or full bridge options.
   */
  constructor(urlOrOptions?: string | McpBridgeOptions) {
    if (typeof urlOrOptions === 'string') {
      this.options = {transport: 'http', httpUrl: urlOrOptions};
    } else {
      this.options = urlOrOptions ?? {};
    }
  }

  async getAgentReputation(nonce: number): Promise<number> {
    try {
      const result = await this.callToolWithRetry(TOOL_GET_AGENT_REPUTATION, {
        nonce,
      });
      if (result.isError) {
        throw new Error('get_agent_reputation returned isError');
      }
      const score = extractNumberFromToolResult(result, 'score');
      if (score === undefined) {
        throw new Error('get_agent_reputation missing score');
      }
      return score;
    } catch {
      this.logger.warn('Failed to fetch reputation, returning default 50');
      return DEFAULT_REPUTATION;
    }
  }

  async getGasPrice(): Promise<string> {
    try {
      const result = await this.callToolWithRetry(TOOL_GET_GAS_PRICE, {});
      if (result.isError) {
        throw new Error('get_gas_price returned isError');
      }
      const gasPrice =
        extractStringFromToolResult(result, 'gasPrice') ??
        extractTextFromToolResult(result);
      if (!gasPrice) {
        throw new Error('get_gas_price missing gasPrice');
      }
      return gasPrice;
    } catch {
      return DEFAULT_GAS_PRICE;
    }
  }

  async verifyRequiredTools(): Promise<boolean> {
    try {
      const client = await this.ensureConnected();
      const listed = await withTimeout(
        client.listTools(),
        CONFIG.REQUEST_TIMEOUT,
        'MCP listTools timeout',
      );
      const tools = Array.isArray(listed.tools) ? listed.tools : [];
      const names = new Set(
        tools
          .map(tool => (tool && typeof tool.name === 'string' ? tool.name : ''))
          .filter(Boolean),
      );
      const hasReputation = names.has(TOOL_GET_AGENT_REPUTATION);
      const hasGas = names.has(TOOL_GET_GAS_PRICE);
      if (!hasReputation || !hasGas) {
        this.logger.warn(
          'MCP server missing required tools: get_agent_reputation and/or get_gas_price',
        );
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(
        `MCP capability check failed: ${(err as Error).message || 'unknown error'}`,
      );
      return false;
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    this.connectPromise = null;
    if (this.client) {
      try {
        await this.client.close();
      } catch (err) {
        this.logger.warn(`MCP client close failed: ${(err as Error).message}`);
      }
    }
    this.client = null;
    this.transport = null;
  }

  private resolveTransport(): McpTransportType {
    return this.options.transport ?? 'http';
  }

  private async ensureConnected(): Promise<Client> {
    if (this.closed) {
      throw new Error('McpBridge is closed');
    }
    if (this.client) {
      return this.client;
    }
    if (!this.connectPromise) {
      this.connectPromise = this.connect();
    }
    return this.connectPromise;
  }

  private async connect(): Promise<Client> {
    const transportType = this.resolveTransport();
    const client = new Client({
      name: 'moltbot-starter-kit',
      version: '1.0.0',
    });

    if (transportType === 'stdio') {
      const command = this.options.stdioCommand ?? DEFAULT_STDIO_COMMAND;
      const args = this.options.stdioArgs ?? DEFAULT_STDIO_ARGS;
      this.transport = new StdioClientTransport({command, args});
    } else {
      const rawUrl = this.options.httpUrl ?? CONFIG.PROVIDERS.MCP_URL;
      const url = normalizeMcpHttpUrl(rawUrl);
      this.transport = new StreamableHTTPClientTransport(url);
    }

    await client.connect(this.transport);
    this.client = client;
    this.logger.info(`MCP connected via ${transportType}`);
    return client;
  }

  private async callToolWithRetry(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{
    isError?: boolean;
    [key: string]: unknown;
  }> {
    const attempts = DEFAULT_MCP_MAX_ATTEMPTS;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const client = await this.ensureConnected();
        const result = await withTimeout(
          client.callTool({
            name,
            arguments: args,
          }),
          CONFIG.REQUEST_TIMEOUT,
          `MCP call timeout for ${name}`,
        );
        return result as {isError?: boolean; [key: string]: unknown};
      } catch (err) {
        this.connectPromise = null;
        this.client = null;
        this.transport = null;
        if (attempt >= attempts) {
          throw err;
        }
        await sleep(DEFAULT_RETRY_DELAY_MS);
      }
    }
    throw new Error(`MCP call failed for ${name}`);
  }
}

/** Ensures the URL targets the MCP streamable HTTP endpoint. */
function normalizeMcpHttpUrl(raw: string): URL {
  const url = new URL(raw);
  const path = url.pathname.replace(/\/$/, '');
  if (path === '' || path === '/') {
    url.pathname = '/mcp';
  }
  return url;
}

function unwrapToolResult(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (record.toolResult && typeof record.toolResult === 'object') {
    return record.toolResult as Record<string, unknown>;
  }
  return record;
}

function extractStructured(
  result: unknown,
): Record<string, unknown> | undefined {
  const resolved = unwrapToolResult(result);
  if (!resolved) {
    return undefined;
  }
  const structured = resolved.structuredContent;
  if (
    structured &&
    typeof structured === 'object' &&
    !Array.isArray(structured)
  ) {
    return structured as Record<string, unknown>;
  }
  return undefined;
}

function extractNumberFromToolResult(
  result: unknown,
  key: string,
): number | undefined {
  const structured = extractStructured(result);
  if (structured && typeof structured[key] === 'number') {
    return structured[key] as number;
  }
  const text = extractTextFromToolResult(result);
  if (!text) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (typeof parsed[key] === 'number') {
      return parsed[key] as number;
    }
  } catch {
    const asNum = Number(text);
    if (!Number.isNaN(asNum)) {
      return asNum;
    }
  }
  return undefined;
}

function extractStringFromToolResult(
  result: unknown,
  key: string,
): string | undefined {
  const structured = extractStructured(result);
  if (structured && typeof structured[key] === 'string') {
    return structured[key] as string;
  }
  if (structured && typeof structured[key] === 'number') {
    return String(structured[key]);
  }
  const text = extractTextFromToolResult(result);
  if (!text) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (typeof parsed[key] === 'string') {
      return parsed[key] as string;
    }
    if (typeof parsed[key] === 'number') {
      return String(parsed[key]);
    }
  } catch {
    return text;
  }
  return undefined;
}

function extractTextFromToolResult(result: unknown): string | undefined {
  const resolved = unwrapToolResult(result);
  if (!resolved || !Array.isArray(resolved.content)) {
    return undefined;
  }
  for (const item of resolved.content) {
    if (
      item &&
      typeof item === 'object' &&
      'type' in item &&
      item.type === 'text' &&
      'text' in item &&
      typeof item.text === 'string'
    ) {
      return item.text;
    }
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(timeoutMessage)),
      timeoutMs,
    );
    promise
      .then(value => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch(err => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

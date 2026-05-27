import {McpBridge} from '../src/mcp_bridge';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

const mockConnect = jest.fn();
const mockCallTool = jest.fn();
const mockClose = jest.fn();
const mockListTools = jest.fn();

jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js');
jest.mock('@modelcontextprotocol/sdk/client/stdio.js');

describe('McpBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MCP_ENABLED;
    delete process.env.MULTIVERSX_MCP_URL;

    (Client as unknown as jest.Mock).mockImplementation(() => ({
      connect: mockConnect,
      callTool: mockCallTool,
      listTools: mockListTools,
      close: mockClose,
    }));

    (StreamableHTTPClientTransport as unknown as jest.Mock).mockImplementation(
      (url: URL) => ({
        kind: 'http',
        url,
      }),
    );

    (StdioClientTransport as unknown as jest.Mock).mockImplementation(
      (options: {command: string; args: string[]}) => ({
        kind: 'stdio',
        ...options,
      }),
    );
  });

  test('uses HTTP transport and calls reputation tool', async () => {
    mockCallTool.mockResolvedValue({
      isError: false,
      structuredContent: {score: 88},
      content: [],
    });

    const bridge = new McpBridge('http://localhost:3000');
    const score = await bridge.getAgentReputation(7);

    expect(score).toBe(88);
    const httpCtor = StreamableHTTPClientTransport as unknown as jest.Mock;
    expect(httpCtor).toHaveBeenCalledTimes(1);
    const httpUrl = httpCtor.mock.calls[0][0] as URL;
    expect(httpUrl.toString()).toBe('http://localhost:3000/mcp');
    expect(mockCallTool).toHaveBeenCalledWith({
      name: 'get_agent_reputation',
      arguments: {nonce: 7},
    });
  });

  test('uses stdio transport when explicitly selected', async () => {
    mockCallTool.mockResolvedValue({
      isError: false,
      structuredContent: {gasPrice: '123'},
      content: [],
    });

    const bridge = new McpBridge({
      transport: 'stdio',
      stdioCommand: 'node',
      stdioArgs: ['server.js', '--flag'],
    });
    const gasPrice = await bridge.getGasPrice();

    expect(gasPrice).toBe('123');
    expect(StdioClientTransport as unknown as jest.Mock).toHaveBeenCalledWith({
      command: 'node',
      args: ['server.js', '--flag'],
    });
  });

  test('falls back to defaults on tool failures', async () => {
    mockCallTool.mockRejectedValue(new Error('transport down'));
    const bridge = new McpBridge('http://localhost:3000/mcp');

    await expect(bridge.getAgentReputation(1)).resolves.toBe(50);
    await expect(bridge.getGasPrice()).resolves.toBe('1000000000');
  });

  test('supports wrapped toolResult payload shape', async () => {
    mockCallTool.mockResolvedValue({
      toolResult: {
        isError: false,
        structuredContent: {gasPrice: 987654321},
        content: [],
      },
    });

    const bridge = new McpBridge('http://localhost:3000/mcp');
    await expect(bridge.getGasPrice()).resolves.toBe('987654321');
  });

  test('close tears down client', async () => {
    mockCallTool.mockResolvedValue({
      isError: false,
      structuredContent: {score: 91},
      content: [],
    });

    const bridge = new McpBridge('http://localhost:3000/mcp');
    await bridge.getAgentReputation(2);
    await bridge.close();

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  test('retries MCP tool call after transient failure', async () => {
    mockCallTool
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        isError: false,
        structuredContent: {score: 77},
        content: [],
      });

    const bridge = new McpBridge({
      httpUrl: 'http://localhost:3000/mcp',
    });
    await expect(bridge.getAgentReputation(5)).resolves.toBe(77);
    expect(mockCallTool).toHaveBeenCalledTimes(2);
  });

  test('verifies required tools from MCP listTools', async () => {
    mockListTools.mockResolvedValue({
      tools: [{name: 'get_agent_reputation'}, {name: 'get_gas_price'}],
    });

    const bridge = new McpBridge('http://localhost:3000/mcp');
    await expect(bridge.verifyRequiredTools()).resolves.toBe(true);
  });
});

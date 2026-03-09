import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = path.resolve(__dirname, '..', 'dist', 'src', 'index.js');
const TEST_VAULT = path.resolve(__dirname, 'test-vault');

// Helper to create a connected MCP client that talks to the real server over stdio
async function createClient(): Promise<Client> {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [SERVER_PATH, TEST_VAULT],
    stderr: 'ignore',
  });

  const client = new Client(
    { name: 'integration-test', version: '1.0.0' },
    { capabilities: {} },
  );

  await client.connect(transport);
  return client;
}

describe('MCP Server Integration', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createClient();
  }, 15000);

  afterAll(async () => {
    await client.close();
  });

  describe('tools/list', () => {
    test('server exposes list_all_tasks and query_tasks tools', async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map((t: any) => t.name);

      expect(toolNames).toContain('list_all_tasks');
      expect(toolNames).toContain('query_tasks');
    });

    test('tools have input schemas', async () => {
      const result = await client.listTools();

      for (const tool of result.tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
      }
    });
  });

  describe('list_all_tasks', () => {
    test('returns tasks from the test vault', async () => {
      const result = await client.callTool({ name: 'list_all_tasks', arguments: {} });
      const tasks = JSON.parse((result.content as any)[0].text);

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
    });

    test('returned tasks have expected structure', async () => {
      const result = await client.callTool({ name: 'list_all_tasks', arguments: {} });
      const tasks = JSON.parse((result.content as any)[0].text);
      const task = tasks[0];

      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('filePath');
      expect(task).toHaveProperty('lineNumber');
      expect(task).toHaveProperty('tags');
      expect(Array.isArray(task.tags)).toBe(true);
    });

    test('tasks include file paths pointing into the vault', async () => {
      const result = await client.callTool({ name: 'list_all_tasks', arguments: {} });
      const tasks = JSON.parse((result.content as any)[0].text);

      expect(tasks.some((t: any) => t.filePath.includes('sample-tasks.md'))).toBe(true);
    });
  });

  describe('query_tasks', () => {
    test('filters done tasks', async () => {
      const result = await client.callTool({
        name: 'query_tasks',
        arguments: { query: 'done' },
      });
      const tasks = JSON.parse((result.content as any)[0].text);

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every((t: any) => t.status === 'complete')).toBe(true);
    });

    test('filters not done tasks', async () => {
      const result = await client.callTool({
        name: 'query_tasks',
        arguments: { query: 'not done' },
      });
      const tasks = JSON.parse((result.content as any)[0].text);

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every((t: any) => t.status === 'incomplete')).toBe(true);
    });

    test('filters by tag inclusion', async () => {
      const result = await client.callTool({
        name: 'query_tasks',
        arguments: { query: 'tag includes #tag' },
      });
      const tasks = JSON.parse((result.content as any)[0].text);

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every((t: any) => t.tags.some((tag: string) => tag.includes('tag')))).toBe(true);
    });

    test('filters by priority', async () => {
      const result = await client.callTool({
        name: 'query_tasks',
        arguments: { query: 'not done\npriority is high' },
      });
      const tasks = JSON.parse((result.content as any)[0].text);

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every((t: any) => t.status === 'incomplete' && t.priority === 'high')).toBe(true);
    });

    test('filters by description includes', async () => {
      const result = await client.callTool({
        name: 'query_tasks',
        arguments: { query: 'description includes repeating' },
      });
      const tasks = JSON.parse((result.content as any)[0].text);

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every((t: any) => t.description.toLowerCase().includes('repeating'))).toBe(true);
    });

    test('multi-line query applies AND logic', async () => {
      const result = await client.callTool({
        name: 'query_tasks',
        arguments: { query: 'not done\ntag includes #tags' },
      });
      const tasks = JSON.parse((result.content as any)[0].text);

      expect(tasks.length).toBeGreaterThan(0);
      for (const task of tasks) {
        expect(task.status).toBe('incomplete');
        expect(task.tags.some((tag: string) => tag.includes('tags'))).toBe(true);
      }
    });

    test('returns empty array for query matching no tasks', async () => {
      const result = await client.callTool({
        name: 'query_tasks',
        arguments: { query: 'description includes xyznonexistent123' },
      });
      const tasks = JSON.parse((result.content as any)[0].text);

      expect(tasks).toEqual([]);
    });
  });

  describe('error handling', () => {
    test('rejects directory traversal in path', async () => {
      const result = await client.callTool({
        name: 'list_all_tasks',
        arguments: { path: '../' },
      });

      expect((result.content as any)[0].text).toContain('directory traversal');
    });

    test('returns error for unknown tool', async () => {
      const result = await client.callTool({ name: 'nonexistent_tool', arguments: {} });

      expect(result.isError).toBe(true);
      expect((result.content as any)[0].text).toContain('Unknown tool');
    });
  });
});

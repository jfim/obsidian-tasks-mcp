#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import os from 'os';
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { glob } from 'glob';

// Command line argument parsing
const args = process.argv.slice(2);
if (args.length === 0 && process.env.NODE_ENV !== 'test') {
  console.error("Usage: obsidian-tasks-mcp <vault-directory>");
  process.exit(1);
}

// Normalize all paths consistently
export function normalizePath(p: string): string {
  return path.normalize(p);
}

export function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

// Set up a single vault directory
const vaultDirectory = args.length > 0 ? 
  normalizePath(path.resolve(expandHome(args[0]))) :
  // For tests, use current directory if no args provided
  normalizePath(path.resolve(process.cwd()));

// Validate that the vault directory exists and is accessible
if (process.env.NODE_ENV !== 'test') {
  try {
    const stats = await fs.stat(vaultDirectory);
    if (!stats.isDirectory()) {
      console.error(`Error: ${args[0]} is not a directory`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error accessing directory ${args[0]}:`, error);
    process.exit(1);
  }
}

// Security utilities
function validateRelativePath(relativePath: string): void {
  // Check for directory traversal attempts
  if (relativePath.includes('..')) {
    throw new Error(`Access denied - directory traversal detected in path: ${relativePath}`);
  }
  
  // Additional path validation can be added here if needed
}

async function resolvePath(relativePath: string = ''): Promise<string> {
  // Validate the relative path doesn't contain directory traversal
  validateRelativePath(relativePath);
  
  // If relativePath is empty, use vault directory directly
  const absolute = relativePath === '' 
    ? vaultDirectory 
    : path.join(vaultDirectory, relativePath);
  
  // For testing environment, we'll simplify path resolution
  if (process.env.NODE_ENV === 'test') {
    // Just return the joined path for tests
    return absolute;
  }
  
  // In production mode, handle symlinks and additional security checks
  try {
    const realPath = await fs.realpath(absolute);
    // Ensure the resolved path is still within the vault directory
    if (!normalizePath(realPath).startsWith(vaultDirectory)) {
      throw new Error("Access denied - symlink target outside vault directory");
    }
    return realPath;
  } catch (error) {
    // For new files that don't exist yet, verify parent directory
    const parentDir = path.dirname(absolute);
    try {
      const realParentPath = await fs.realpath(parentDir);
      if (!normalizePath(realParentPath).startsWith(vaultDirectory)) {
        throw new Error("Access denied - parent directory outside vault directory");
      }
      return absolute;
    } catch {
      throw new Error(`Parent directory does not exist: ${parentDir}`);
    }
  }
}

// Schema definitions
export const ListAllTasksArgsSchema = z.object({
  path: z.string().optional(),
});

export const QueryTasksArgsSchema = z.object({
  path: z.string().optional(),
  query: z.string(),
});

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Server setup
const server = new Server(
  {
    name: "obsidian-tasks-mcp",
    version: "0.1.4",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool implementations

import { parseTasks, queryTasks as filterTasks, taskToString, Task } from './TaskParser.js';

export async function findAllMarkdownFiles(startPath: string): Promise<string[]> {
  // glob requires forward slashes even on Windows
  const pattern = startPath.replace(/\\/g, '/') + '/**/*.md';
  return glob(pattern);
}

export async function extractTasksFromFile(filePath: string): Promise<Task[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Use the parseTasks function from TaskParser
    const tasks = parseTasks(content, filePath);
    
    return tasks;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return [];
  }
}

export async function findAllTasks(directoryPath: string): Promise<Task[]> {
  const markdownFiles = await findAllMarkdownFiles(directoryPath);
  const allTasks: Task[] = [];
  
  for (const filePath of markdownFiles) {
    try {
      // Extract tasks from each file
      const tasks = await extractTasksFromFile(filePath);
      allTasks.push(...tasks);
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }
  
  return allTasks;
}

// Apply a query to a list of tasks
export function queryTasks(tasks: Task[], queryText: string): Task[] {
  try {
    return filterTasks(tasks, queryText);
  } catch (error) {
    console.error(`Error querying tasks: ${error}`);
    // If the query fails, return an empty list
    return [];
  }
}

// Helper function to serialize tasks to JSON
export function serializeTasksToJson(tasks: Task[]): string {
  return JSON.stringify(tasks, null, 2);
}



// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_all_tasks",
        description:
          "Extract all tasks from markdown files in a directory. " +
          "Recursively scans all markdown files and extracts tasks based on the Obsidian Tasks format. " +
          "Returns structured data about each task including status, dates, and tags. " +
          "The path parameter is optional; if not specified, it defaults to the vault root directory. " +
          "The path must be relative to the vault directory and cannot contain directory traversal components (..).",
        inputSchema: zodToJsonSchema(ListAllTasksArgsSchema) as ToolInput,
      },
      {
        name: "query_tasks",
        description:
          "Search for tasks based on Obsidian Tasks query syntax. " +
          "Allows filtering tasks by status, dates, description, tags, priority, and path. " +
          "Each line in the query is treated as a filter with AND logic between lines. " +
          "Returns only tasks that match all query conditions. " +
          "Examples of task filters are `done`, `not done`, `tag include #foo/bar`, `tag do not include #potato`, `description includes keyword`. " +
          "The path parameter is optional; if not specified, it defaults to the vault root directory. " +
          "The path must be relative to the vault directory and cannot contain directory traversal components (..).",
        inputSchema: zodToJsonSchema(QueryTasksArgsSchema) as ToolInput,
      }
    ],
  };
});


// Exported handlers for testing
export async function handleListAllTasksRequest(args: any) {
  try {
    const parsed = ListAllTasksArgsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid arguments for list_all_tasks: ${parsed.error}`);
    }
    
    // Use specified path or default to vault root directory
    const relativePath = parsed.data.path || '';
    
    // Validate and resolve the path (even in test mode)
    const validPath = await resolvePath(relativePath);
    
    const tasks = await findAllTasks(validPath);
    return {
      content: [{ type: "text", text: serializeTasksToJson(tasks) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
}

export async function handleQueryTasksRequest(args: any) {
  try {
    const parsed = QueryTasksArgsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid arguments for query_tasks: ${parsed.error}`);
    }
    
    // Use specified path or default to vault root directory
    const relativePath = parsed.data.path || '';
    
    // Validate and resolve the path (even in test mode)
    const validPath = await resolvePath(relativePath);
    
    // Get all tasks from the directory
    const allTasks = await findAllTasks(validPath);
    
    // Apply the query to filter tasks
    const filteredTasks = queryTasks(allTasks, parsed.data.query);
    
    return {
      content: [{ type: "text", text: serializeTasksToJson(filteredTasks) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (name === "list_all_tasks") {
      return await handleListAllTasksRequest(args);
    }
    
    if (name === "query_tasks") {
      return await handleQueryTasksRequest(args);
    }
    
    throw new Error(`Unknown tool: ${name}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Obsidian Tasks MCP Server running on stdio");
  console.error("Vault directory:", vaultDirectory);
}

// Don't run the server in test mode
if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_SERVER !== 'true') {
  runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
  });
}

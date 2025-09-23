# Obsidian Tasks MCP Server

[![npm version](https://badge.fury.io/js/%40jfim%2Fobsidian-tasks-mcp.svg)](https://badge.fury.io/js/%40jfim%2Fobsidian-tasks-mcp)

A Model Context Protocol (MCP) server for extracting and querying Obsidian Tasks from markdown files. Designed to work with Claude via the MCP protocol to enable AI-assisted task management.

## Features

- Extract tasks from Obsidian markdown files with a format compatible with the Obsidian Tasks plugin
- Identify completed and pending tasks
- Access task metadata including:
  - Status (complete/incomplete)
  - Due dates
  - Scheduled dates
  - Start dates
  - Created dates
  - Tags
  - Priority
  - Recurrence rules

## Tools

This MCP server provides the following tools:

### list_all_tasks

Extracts all tasks from markdown files in a directory, recursively scanning through subfolders.

**Input Parameters:**
- `path` (string, optional): The directory to scan for markdown files. If not specified, defaults to the first allowed directory.

**Returns:**
A JSON array of task objects, each containing:
```json
{
  "id": "string",          // Unique identifier (filepath:linenumber)
  "description": "string", // Full text description of the task
  "status": "complete" | "incomplete", // Task completion status
  "filePath": "string",    // Path to the file containing the task
  "lineNumber": "number",  // Line number in the file
  "tags": ["string"],      // Array of tags found in the task
  "dueDate": "string",     // Optional - YYYY-MM-DD format 
  "scheduledDate": "string", // Optional - YYYY-MM-DD format
  "startDate": "string",   // Optional - YYYY-MM-DD format
  "createdDate": "string", // Optional - YYYY-MM-DD format
  "priority": "string",    // Optional - "high", "medium", or "low"
  "recurrence": "string"   // Optional - recurrence rule
}
```

### query_tasks

Searches for tasks based on Obsidian Tasks query syntax. Applies multiple filters to find matching tasks.

**Input Parameters:**
- `path` (string, optional): The directory to scan for markdown files. If not specified, defaults to the first allowed directory.
- `query` (string, required): The query string using Obsidian Tasks query syntax. Each line is treated as a filter.

**Returns:**
A JSON array of task objects that match the query, with the same structure as `list_all_tasks`.

**Supported Query Syntax:**

- Status filters:
  - `done` - Show completed tasks
  - `not done` - Show incomplete tasks

- Date filters (due):
  - Note on semantics: `due today` is an exact match (only tasks due exactly today). Use range operators to include earlier/later dates.
  - `due today` - Tasks due today
  - `due before today` - Tasks due before today (exclusive)
  - `due after today` - Tasks due after today (exclusive)
  - `due on or before today` - Tasks due today or earlier (inclusive)
  - `due on or after today` - Tasks due today or later (inclusive)
  - `due on YYYY-MM-DD` or `due YYYY-MM-DD` - Tasks due on a specific date
  - `due before YYYY-MM-DD` - Tasks due before a date (exclusive)
  - `due after YYYY-MM-DD` - Tasks due after a date (exclusive)
  - `due on or before YYYY-MM-DD` - Tasks due on/before a date (inclusive)
  - `due on or after YYYY-MM-DD` - Tasks due on/after a date (inclusive)
  - `no due date` - Tasks with no due date
  - `has due date` - Tasks with a due date

- Start date filters:
  - Note on semantics: `starts today` is an exact match (only tasks that start today). Use range operators to include earlier/later dates.
  - `starts today` - Tasks starting today
  - `starts on YYYY-MM-DD` or `starts YYYY-MM-DD` - Start on a specific date
  - `starts before YYYY-MM-DD` - Start before a date (exclusive)
  - `starts after YYYY-MM-DD` - Start after a date (exclusive)
  - `starts on or before YYYY-MM-DD` - Start on/before a date (inclusive)
  - `starts on or after YYYY-MM-DD` - Start on/after a date (inclusive)
  - `no start date` - Tasks with no start date
  - `has start date` - Tasks with a start date

- Tag filters:
  - `no tags` - Tasks with no tags
  - `has tags` - Tasks with at least one tag
  - `tag include #tag` - Tasks with tags containing "tag"
  - `tag do not include #tag` - Tasks without tags containing "tag" 

- Path filters:
  - `path includes string` - Tasks in files with paths containing "string"
  - `path does not include string` - Tasks in files with paths not containing "string"

- Description filters:
  - `description includes string` - Tasks with descriptions containing "string"
  - `description does not include string` - Tasks with descriptions not containing "string"

- Priority filters:
  - `priority is high` - Tasks with high priority
  - `priority is medium` - Tasks with medium priority
  - `priority is low` - Tasks with low priority
  - `priority is none` - Tasks with no priority

**Example Query:**
```
not done
due before 2025-05-01
tag include #work
```
This would return all incomplete tasks due before May 1, 2025, that have the #work tag.

Inclusive OR example (single line):
```
due on or before today OR starts on or before today
```

## Usage

### Installation

From npm (recommended):

```bash
# Install globally
npm install -g @jfim/obsidian-tasks-mcp

# Or use directly with npx without installing
npx @jfim/obsidian-tasks-mcp /path/to/obsidian/vault
```

From source:

```bash
git clone https://github.com/jfim/obsidian-tasks-mcp.git
cd obsidian-tasks-mcp
npm install
npm run build
```

### Running the Server

Using npm package (recommended):

```bash
# If installed globally
obsidian-tasks-mcp /path/to/obsidian/vault

# Or with npx (no installation required)
npx @jfim/obsidian-tasks-mcp /path/to/obsidian/vault
```

From source:

```bash
node dist/index.js /path/to/obsidian/vault
```

You can specify multiple directories:

```bash
npx @jfim/obsidian-tasks-mcp /path/to/obsidian/vault /another/directory
```

### Testing

To run the test suite:

```bash
npm test
```

See [TESTING.md](TESTING.md) for detailed information about the test suite.

### Using with Claude

Add this configuration to your Claude client that supports MCP:

```json
{
  "mcpServers": {
    "obsidian-tasks": {
      "command": "npx",
      "args": [
        "@jfim/obsidian-tasks-mcp",
        "/path/to/obsidian/vault"
      ]
    }
  }
}
```

If you installed from source:

```json
{
  "mcpServers": {
    "obsidian-tasks": {
      "command": "node",
      "args": [
        "/path/to/obsidian-tasks-mcp/dist/index.js",
        "/path/to/obsidian/vault"
      ]
    }
  }
}
```

### Docker

Build the Docker image:

```bash
docker build -t @jfim/obsidian-tasks-mcp .
```

Run with Docker:

```bash
docker run -i --rm --mount type=bind,src=/path/to/obsidian/vault,dst=/projects/vault @jfim/obsidian-tasks-mcp /projects
```

Claude Desktop configuration:

```json
{
  "mcpServers": {
    "obsidian-tasks": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--mount", "type=bind,src=/path/to/obsidian/vault,dst=/projects/vault",
        "@jfim/obsidian-tasks-mcp",
        "/projects"
      ]
    }
  }
}
```

## Task Format

The server recognizes the following Obsidian Tasks format:

- Task syntax: `- [ ] Task description`
- Completed task: `- [x] Task description`
- Due date: 
  - `🗓️ YYYY-MM-DD`
  - `📅 YYYY-MM-DD`
- Scheduled date: `⏳ YYYY-MM-DD`
- Start date: `🛫 YYYY-MM-DD`
- Created date: `➕ YYYY-MM-DD`
- Priority: `⏫` (high), `🔼` (medium), `🔽` (low)
- Recurrence: `🔁 every day/week/month/etc.`
- Tags: `#tag1 #tag2`

Example task: `- [ ] Complete project report 🗓️ 2025-05-01 ⏳ 2025-04-25 #work #report ⏫`

## License

MIT License

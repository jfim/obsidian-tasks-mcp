# @jfim/obsidian-tasks-mcp

A Model Context Protocol (MCP) server for extracting and querying Obsidian Tasks from markdown files. Designed to work with Claude via the MCP protocol to enable AI-assisted task management.

## Installation

You can install globally:

```bash
npm install -g @jfim/obsidian-tasks-mcp
```

Or use with npx without installing:

```bash
npx @jfim/obsidian-tasks-mcp /path/to/obsidian/vault
```

## Usage

### Running the Server

If installed globally:

```bash
obsidian-tasks-mcp /path/to/obsidian/vault
```

With npx (recommended):

```bash
npx @jfim/obsidian-tasks-mcp /path/to/obsidian/vault
```

You can specify multiple directories:

```bash
npx @jfim/obsidian-tasks-mcp /path/to/obsidian/vault /another/directory
```

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

## Features

This MCP server provides the following tools:

### list_all_tasks

Extracts all tasks from markdown files in a directory, recursively scanning through subfolders.

### query_tasks

Searches for tasks using a simplified Obsidian Tasks query syntax. Each line is a separate filter and lines are combined with AND logic.

Boolean logic:
- Use `AND` / `and` and `OR` / `or` within a single line
- Use `not <filter>` to negate
- The phrases `on or before` and `on or after` are inclusive date operators, not boolean OR

Supported query syntax:
- Status:
  - `done`
  - `not done`

- Due date:
  - Note: `due today` is exact equality (only tasks due exactly today). Use ranges (`before/after`, `on or before/after`) to include other dates.
  - `due today`
  - `due before today` (exclusive)
  - `due after today` (exclusive)
  - `due on or before today` (inclusive)
  - `due on or after today` (inclusive)
  - `due on YYYY-MM-DD` or `due YYYY-MM-DD`
  - `due before YYYY-MM-DD` (exclusive)
  - `due after YYYY-MM-DD` (exclusive)
  - `due on or before YYYY-MM-DD` (inclusive)
  - `due on or after YYYY-MM-DD` (inclusive)
  - `no due date` / `has due date`

- Start date:
  - Note: `starts today` is exact equality. Use ranges to include other dates.
  - `starts today`
  - `starts on YYYY-MM-DD` or `starts YYYY-MM-DD`
  - `starts before YYYY-MM-DD` (exclusive)
  - `starts after YYYY-MM-DD` (exclusive)
  - `starts on or before YYYY-MM-DD` (inclusive)
  - `starts on or after YYYY-MM-DD` (inclusive)
  - `no start date` / `has start date`

- Tags:
  - `has tags` / `no tags`
  - `tag includes #foo/bar`
  - `has tag #exact`

- Path:
  - `path includes some/folder`
  - `path does not include archive`

- Description:
  - `description includes keyword`
  - `description does not include keyword`

- Priority:
  - `priority is highest|high|medium|low|lowest|none`

Examples:
```text
# (A OR B) AND C
due on or before 2025-05-01 OR starts on or before 2025-05-01
not done
```

```text
# High priority incomplete tasks due soon
not done
priority is high
due on or before 2025-05-01
```

For more details, see the full documentation at [GitHub Repository](https://github.com/jfim/obsidian-tasks-mcp).

## License

MIT
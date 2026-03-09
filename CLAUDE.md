# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Test Commands
- Build: `npm run build` - Compiles TypeScript to JS and makes executable
- Watch: `npm run watch` - Runs TypeScript compiler in watch mode
- Test all: `npm test`
- Test single file: `npx jest tests/path/to/file.test.ts`
- Test specific test: `npx jest -t "test description"`

## Code Style Guidelines
- **TypeScript**: Strict typing, ES modules with `.js` extension in import paths
- **Imports**: Use ES module syntax (import/export)
- **Naming**: camelCase for functions/variables, PascalCase for interfaces/types
- **Files**: kebab-case for filenames (e.g., `task-parsing.test.ts`)
- **Types**: Use explicit interfaces, avoid `any`, use Zod for validation
- **Error Handling**: Try/catch with descriptive messages, extract with `error instanceof Error ? error.message : String(error)`
- **Testing**: Organize with Jest's describe/test structure, follow AAA pattern
- **Comments**: Focus on explaining "why" more than "what"
- **Security**: Validate paths to prevent directory traversal

## Project Structure
- `src/` - Source code (TaskParser.ts is the core parser, index.ts is the MCP server)
- `tests/` - Test files (`*.test.ts`)
- `tests/test-vault/` - Test vault with sample markdown files for testing
- `tests/integration.test.ts` - Integration tests that spawn the MCP server and communicate over stdio

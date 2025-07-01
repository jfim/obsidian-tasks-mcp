/**
 * TaskParser - Inspired by Obsidian Tasks but simplified for MCP
 * 
 * This file contains a simplified implementation inspired by Obsidian Tasks
 * but without the dependency complexity.
 */

import moment from 'moment';

// Interface for our task object
export interface Task {
  id: string;
  description: string;
  status: 'complete' | 'incomplete' | 'cancelled' | 'in_progress' | 'non_task';
  statusSymbol: string;
  filePath: string;
  lineNumber: number;
  tags: string[];
  dueDate?: string;
  scheduledDate?: string;
  createdDate?: string;
  startDate?: string;
  priority?: string;
  recurrence?: string;
  originalMarkdown: string;
}

// Regular expressions based on Obsidian Tasks conventions
export class TaskRegex {
  // Matches indentation before a list marker (including > for potentially nested blockquotes or Obsidian callouts)
  static readonly indentationRegex = /^([\s\t>]*)/;

  // Matches - * and + list markers, or numbered list markers, for example 1. and 1)
  static readonly listMarkerRegex = /([-*+]|[0-9]+[.)])/;

  // Matches a checkbox and saves the status character inside
  static readonly checkboxRegex = /\[(.)\]/u;

  // Matches the rest of the task after the checkbox.
  static readonly afterCheckboxRegex = / *(.*)/u;

  // Main regex for parsing a line. It matches the following:
  // - Indentation
  // - List marker
  // - Status character
  // - Rest of task after checkbox markdown
  static readonly taskRegex = new RegExp(
    TaskRegex.indentationRegex.source +
    TaskRegex.listMarkerRegex.source +
    ' +' +
    TaskRegex.checkboxRegex.source +
    TaskRegex.afterCheckboxRegex.source,
    'u',
  );
  
  // Matches hashtags in task descriptions
  static readonly hashTags = /(^|\s)#[^ !@#$%^&*(),.?":{}|<>]+/g;
  
  // Date related regular expressions - matches emoji followed by date
  static readonly dueDateRegex = /[📅🗓️]\s?(\d{4}-\d{2}-\d{2})/;
  static readonly scheduledDateRegex = /⏳\s?(\d{4}-\d{2}-\d{2})/;
  static readonly startDateRegex = /🛫\s?(\d{4}-\d{2}-\d{2})/;
  static readonly createdDateRegex = /➕\s?(\d{4}-\d{2}-\d{2})/;
  
  // Priority emoji - order is important! Longest pattern first
  static readonly priorityRegex = /(⏫⏫|⏫|🔼|🔽|⏬)/g;
  
  // Recurrence
  static readonly recurrenceRegex = /🔁\s?(.*?)(?=(\s|$))/;
}

/**
 * Parse a string containing text that may have tasks and extract Task objects.
 * 
 * @param text The text to parse for tasks
 * @param filePath Optional file path for the task location
 * @returns Array of Task objects
 */
export function parseTasks(text: string, filePath: string = ''): Task[] {
  const lines = text.split('\n');
  const tasks: Task[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const task = parseTaskLine(line, filePath, i);
    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
}

/**
 * Parse a task from a line of text
 */
export function parseTaskLine(line: string, filePath: string = '', lineNumber: number = 0): Task | null {
  const match = line.match(TaskRegex.taskRegex);
  if (!match) {
    return null;
  }
  
  const statusChar = match[3];
  const description = match[4].trim();
  
  // Extract tags
  const tags = (description.match(TaskRegex.hashTags) || [])
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  
  // Check for dates
  const dueMatch = description.match(TaskRegex.dueDateRegex);
  const scheduledMatch = description.match(TaskRegex.scheduledDateRegex);
  const startMatch = description.match(TaskRegex.startDateRegex);
  const createdMatch = description.match(TaskRegex.createdDateRegex);
  const recurrenceMatch = description.match(TaskRegex.recurrenceRegex);
  
  // Determine priority - check for highest priority first
  let priority = undefined;
  
  // Use regex to find all priority markers in order of appearance
  const priorityMatches = description.match(/⏫⏫|⏫|🔼|🔽|⏬/g);
  
  if (priorityMatches && priorityMatches.length > 0) {
    // Use the first priority marker found
    const firstPriority = priorityMatches[0];
    
    if (firstPriority === '⏫⏫') priority = 'highest';
    else if (firstPriority === '⏫') priority = 'high';
    else if (firstPriority === '🔼') priority = 'medium';
    else if (firstPriority === '🔽') priority = 'low';
    else if (firstPriority === '⏬') priority = 'lowest';
  }
  
  // Create a unique ID
  const id = `${filePath}:${lineNumber}`;
  
  // Determine task status from the statusChar
  let status: Task['status'] = 'incomplete';
  if (['x', 'X'].includes(statusChar)) {
    status = 'complete';
  } else if (['-'].includes(statusChar)) {
    status = 'cancelled';
  } else if (['/'].includes(statusChar)) {
    status = 'in_progress';
  } else if ([' ', '>', '<'].includes(statusChar)) {
    status = 'incomplete';
  } else {
    // Any other character is treated as a non-task
    status = 'non_task';
  }
  
  const task: Task = {
    id,
    description,
    status,
    statusSymbol: statusChar,
    filePath,
    lineNumber,
    tags,
    dueDate: dueMatch ? dueMatch[1] : undefined,
    scheduledDate: scheduledMatch ? scheduledMatch[1] : undefined,
    startDate: startMatch ? startMatch[1] : undefined,
    createdDate: createdMatch ? createdMatch[1] : undefined,
    priority,
    recurrence: recurrenceMatch ? recurrenceMatch[1] : undefined,
    originalMarkdown: line
  };
  
  return task;
}

/**
 * Apply a filter function to a task
 */
export function applyFilter(task: Task, filter: string): boolean {
  filter = filter.toLowerCase().trim();
  
  // Boolean combinations with AND, OR, NOT
  if (filter.includes(' AND ')) {
    const parts = filter.split(' AND ');
    return parts.every(part => applyFilter(task, part.trim()));
  }
  
  if (filter.includes(' OR ')) {
    const parts = filter.split(' OR ');
    return parts.some(part => applyFilter(task, part.trim()));
  }
  
  // Case insensitive versions
  if (filter.includes(' and ')) {
    const parts = filter.split(' and ');
    return parts.every(part => applyFilter(task, part.trim()));
  }
  
  if (filter.includes(' or ')) {
    const parts = filter.split(' or ');
    return parts.some(part => applyFilter(task, part.trim()));
  }
  
  if (filter.startsWith('not ')) {
    const subFilter = filter.substring(4);
    return !applyFilter(task, subFilter);
  }
  
  // Status-based filters
  if (filter === 'done') {
    return task.status === 'complete';
  }
  if (filter === 'not done') {
    // Not done should only include tasks that are truly active (incomplete or in progress)
    return task.status === 'incomplete' || task.status === 'in_progress';
  }
  if (filter === 'cancelled') {
    return task.status === 'cancelled';
  }
  if (filter === 'in progress') {
    return task.status === 'in_progress';
  }
  
  // Due date filters
  if (filter.startsWith('due') || filter === 'has due date' || filter === 'no due date') {
    if (filter === 'due today') {
      const today = moment().format('YYYY-MM-DD');
      return task.dueDate === today;
    }
    if (filter === 'due before today') {
      const today = moment().format('YYYY-MM-DD');
      return task.dueDate !== undefined && task.dueDate < today;
    }
    if (filter === 'due after today') {
      const today = moment().format('YYYY-MM-DD');
      return task.dueDate !== undefined && task.dueDate > today;
    }
    if (filter === 'no due date') {
      return task.dueDate === undefined;
    }
    if (filter === 'has due date') {
      return task.dueDate !== undefined;
    }
  }
  
  // Tag filters
  if (filter === 'no tags') {
    return !task.tags || task.tags.length === 0;
  }
  
  if (filter === 'has tags') {
    return task.tags && task.tags.length > 0;
  }
  
  if (filter.startsWith('tag includes ')) {
    const tagToFind = filter.split('tag includes ')[1].trim().replace(/^#/, '');
    return task.tags && task.tags.some(tag => tag.replace(/^#/, '').includes(tagToFind));
  }
  
  if (filter.startsWith('has tag ')) {
    const tagToFind = filter.substring(8).trim().replace(/^#/, '');
    return task.tags && task.tags.some(tag => {
      // Remove # prefix for comparison
      const normalizedTag = tag.replace(/^#/, '');
      // For exact matching, check if the tag equals the search term
      return normalizedTag === tagToFind;
    });
  }
  
  // Path/filename filters
  if (filter.startsWith('path includes')) {
    const pathToFind = filter.split('includes')[1].trim();
    return task.filePath.toLowerCase().includes(pathToFind.toLowerCase());
  }
  
  if (filter.startsWith('path does not include')) {
    const pathToExclude = filter.split('does not include')[1].trim();
    return !task.filePath.toLowerCase().includes(pathToExclude.toLowerCase());
  }
  
  // Description filters
  if (filter.startsWith('description includes')) {
    const textToFind = filter.split('includes')[1].trim();
    return task.description.toLowerCase().includes(textToFind.toLowerCase());
  }
  
  if (filter.startsWith('description does not include')) {
    const textToExclude = filter.split('does not include')[1].trim();
    return !task.description.toLowerCase().includes(textToExclude.toLowerCase());
  }
  
  // Priority filters
  if (filter.startsWith('priority is')) {
    const priority = filter.split('priority is')[1].trim();
    if (priority === 'highest') {
      return task.priority === 'highest';
    }
    if (priority === 'high') {
      return task.priority === 'high';
    }
    if (priority === 'medium') {
      return task.priority === 'medium';
    }
    if (priority === 'low') {
      return task.priority === 'low';
    }
    if (priority === 'lowest') {
      return task.priority === 'lowest';
    }
    if (priority === 'none') {
      return task.priority === undefined;
    }
  }
  
  // If no filter match, check if description contains the filter text
  return task.description.toLowerCase().includes(filter);
}

/**
 * Parse a query string into a set of filter lines
 */
export function parseQuery(queryText: string): string[] {
  // Split into lines and remove empty ones and comments
  return queryText.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

/**
 * Apply a query to a list of tasks
 */
export function queryTasks(tasks: Task[], queryText: string): Task[] {
  const filters = parseQuery(queryText);
  
  // Apply all filters in sequence (AND logic between lines)
  return tasks.filter(task => {
    for (const filter of filters) {
      if (!applyFilter(task, filter)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Convert a Task object back to its string representation
 * 
 * @param task Task object to convert
 * @returns String representation of the task
 */
export function taskToString(task: Task): string {
  return task.originalMarkdown;
}
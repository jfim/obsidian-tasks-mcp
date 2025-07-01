import fs from 'fs/promises';
import path from 'path';

// Import the functions to test
import { extractTasksFromFile } from '../src/index.js';

describe('Task Extraction', () => {
  const testVaultPath = path.join(process.cwd(), 'tests', 'test-vault');
  const sampleTasksPath = path.join(testVaultPath, 'sample-tasks.md');
  
  // Disable the server auto-start for tests
  process.env.DISABLE_SERVER = 'true';
  
  beforeAll(async () => {
    // Verify that the test vault exists
    try {
      await fs.access(testVaultPath);
      await fs.access(sampleTasksPath);
    } catch (error) {
      throw new Error(`Test vault not accessible: ${error}`);
    }
  });
  
  test('extractTasksFromFile should parse tasks correctly', async () => {
    const tasks = await extractTasksFromFile(sampleTasksPath);
    
    // Should find the right number of tasks
    expect(tasks.length).toBe(18); // Total tasks in sample-tasks.md
    
    // Check incomplete tasks
    const incompleteTasks = tasks.filter(task => task.status === 'incomplete');
    expect(incompleteTasks.length).toBe(14);
    
    // Check complete tasks
    const completeTasks = tasks.filter(task => task.status === 'complete');
    expect(completeTasks.length).toBe(4);
    
    // Check tasks with tags
    const tasksWithTags = tasks.filter(task => task.tags && task.tags.length > 0);
    expect(tasksWithTags.length).toBeGreaterThan(0);
    
    // Check tasks with due dates
    const tasksWithDueDate = tasks.filter(task => task.dueDate);
    expect(tasksWithDueDate.length).toBeGreaterThan(0);
    
    // Check a specific task - high priority task
    const highPriorityTask = tasks.find(task => 
      task.description.includes('high priority') && task.status === 'incomplete');
    
    expect(highPriorityTask).toBeDefined();
    if (highPriorityTask) {
      expect(highPriorityTask.priority).toBe('high');
      expect(highPriorityTask.description).toContain('⏫');
    }
  });
});
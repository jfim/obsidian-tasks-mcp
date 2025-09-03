import fs from 'fs/promises';
import path from 'path';
import { findAllTasks, queryTasks } from '../src/index.js';
import { parseTaskLine } from '../src/TaskParser.js';

describe('Dataview Format Support', () => {
  const testVaultPath = path.join(process.cwd(), 'tests', 'test-vault');
  
  // Disable the server auto-start for tests
  process.env.DISABLE_SERVER = 'true';
  
  describe('Parsing Dataview inline fields', () => {
    test('should parse due date in Dataview format', () => {
      const line = '- [ ] Task with due date [due:: 2025-01-15]';
      const task = parseTaskLine(line, 'test.md', 1);
      
      expect(task).not.toBeNull();
      expect(task?.dueDate).toBe('2025-01-15');
      expect(task?.description).toContain('[due:: 2025-01-15]');
    });
    
    test('should parse scheduled date in Dataview format', () => {
      const line = '- [ ] Task with scheduled date [scheduled:: 2025-01-20]';
      const task = parseTaskLine(line, 'test.md', 1);
      
      expect(task).not.toBeNull();
      expect(task?.scheduledDate).toBe('2025-01-20');
    });
    
    test('should parse start date in Dataview format', () => {
      const line = '- [ ] Task with start date [start:: 2025-01-10]';
      const task = parseTaskLine(line, 'test.md', 1);
      
      expect(task).not.toBeNull();
      expect(task?.startDate).toBe('2025-01-10');
    });
    
    test('should parse created date in Dataview format', () => {
      const line = '- [ ] Task with created date [created:: 2025-01-01]';
      const task = parseTaskLine(line, 'test.md', 1);
      
      expect(task).not.toBeNull();
      expect(task?.createdDate).toBe('2025-01-01');
    });
    
    test('should parse priority in Dataview format', () => {
      const testCases = [
        { line: '- [ ] Task [priority:: highest]', expected: 'highest' },
        { line: '- [ ] Task [priority:: high]', expected: 'high' },
        { line: '- [ ] Task [priority:: medium]', expected: 'medium' },
        { line: '- [ ] Task [priority:: low]', expected: 'low' },
        { line: '- [ ] Task [priority:: lowest]', expected: 'lowest' },
      ];
      
      testCases.forEach(({ line, expected }) => {
        const task = parseTaskLine(line, 'test.md', 1);
        expect(task).not.toBeNull();
        expect(task?.priority).toBe(expected);
      });
    });
    
    test('should parse recurrence in Dataview format', () => {
      const line = '- [ ] Task with recurrence [repeat:: every week]';
      const task = parseTaskLine(line, 'test.md', 1);
      
      expect(task).not.toBeNull();
      expect(task?.recurrence).toBe('every week');
    });
    
    test('should parse multiple Dataview fields', () => {
      const line = '- [ ] Complex task [due:: 2025-02-14] [priority:: high] [scheduled:: 2025-02-01]';
      const task = parseTaskLine(line, 'test.md', 1);
      
      expect(task).not.toBeNull();
      expect(task?.dueDate).toBe('2025-02-14');
      expect(task?.scheduledDate).toBe('2025-02-01');
      expect(task?.priority).toBe('high');
    });
    
    test('should handle mixed emoji and Dataview formats', () => {
      const line = '- [ ] Mixed task 📅 2025-03-01 [priority:: medium]';
      const task = parseTaskLine(line, 'test.md', 1);
      
      expect(task).not.toBeNull();
      expect(task?.dueDate).toBe('2025-03-01');
      expect(task?.priority).toBe('medium');
    });
    
    test('should prefer emoji format when both are present', () => {
      const line = '- [ ] Task 📅 2025-03-01 [due:: 2025-03-15]';
      const task = parseTaskLine(line, 'test.md', 1);
      
      expect(task).not.toBeNull();
      // Emoji format should take precedence
      expect(task?.dueDate).toBe('2025-03-01');
    });
  });
  
  describe('Querying Dataview format tasks', () => {
    test('should find tasks with Dataview due dates using "has due date" query', async () => {
      const allTasks = await findAllTasks(testVaultPath);
      const tasksWithDueDate = queryTasks(allTasks, 'has due date');
      
      // Should find tasks with both emoji and Dataview due date formats
      const dataviewDueTasks = tasksWithDueDate.filter(task => 
        task.description.includes('[due::')
      );
      
      expect(dataviewDueTasks.length).toBeGreaterThan(0);
      expect(dataviewDueTasks.every(task => task.dueDate !== undefined)).toBe(true);
    });
    
    test('should find high priority tasks in Dataview format', async () => {
      const allTasks = await findAllTasks(testVaultPath);
      const highPriorityTasks = queryTasks(allTasks, 'priority is high');
      
      // Should find tasks with both emoji and Dataview priority formats
      const dataviewPriorityTasks = highPriorityTasks.filter(task => 
        task.description.includes('[priority:: high]')
      );
      
      expect(dataviewPriorityTasks.length).toBeGreaterThan(0);
      expect(dataviewPriorityTasks.every(task => task.priority === 'high')).toBe(true);
    });
    
    test('should handle complex queries with Dataview format', async () => {
      const allTasks = await findAllTasks(testVaultPath);
      
      // Query for incomplete tasks with due dates
      const query = `not done
has due date`;
      
      const filteredTasks = queryTasks(allTasks, query);
      
      // Should include both emoji and Dataview format tasks
      const hasDataviewTasks = filteredTasks.some(task => 
        task.description.includes('[due::')
      );
      const hasEmojiTasks = filteredTasks.some(task => 
        task.description.includes('📅') || task.description.includes('🗓️')
      );
      
      expect(filteredTasks.length).toBeGreaterThan(0);
      expect(hasDataviewTasks).toBe(true);
      expect(hasEmojiTasks).toBe(true);
      
      // All should be incomplete and have due dates
      expect(filteredTasks.every(task => 
        (task.status === 'incomplete' || task.status === 'in_progress') && 
        task.dueDate !== undefined
      )).toBe(true);
    });
    
    test('should find tasks without due dates in Dataview format', async () => {
      const allTasks = await findAllTasks(testVaultPath);
      const tasksWithoutDueDate = queryTasks(allTasks, 'no due date');
      
      // Should not have any due dates in either format
      expect(tasksWithoutDueDate.every(task => 
        task.dueDate === undefined
      )).toBe(true);
      
      // Should not contain due date markers
      expect(tasksWithoutDueDate.every(task => 
        !task.description.includes('[due::') &&
        !task.description.includes('📅') &&
        !task.description.includes('🗓️')
      )).toBe(true);
    });
  });
});
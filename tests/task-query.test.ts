import fs from 'fs/promises';
import path from 'path';
import moment from 'moment';

// Import the functions to test
import { findAllTasks, queryTasks } from '../src/index.js';

describe('Task Querying', () => {
  const testVaultPath = path.join(process.cwd(), 'tests', 'test-vault');
  
  // Disable the server auto-start for tests
  process.env.DISABLE_SERVER = 'true';
  
  beforeAll(async () => {
    // Verify that the test vault exists
    try {
      await fs.access(testVaultPath);
    } catch (error) {
      throw new Error(`Test vault not accessible: ${error}`);
    }
  });
  
  test('findAllTasks should collect all tasks from the test vault', async () => {
    const tasks = await findAllTasks(testVaultPath);
    expect(tasks.length).toBeGreaterThan(0);
  });
  
  test('queryTasks with done filter should return only completed tasks', async () => {
    const allTasks = await findAllTasks(testVaultPath);
    const query = 'done';
    const filteredTasks = queryTasks(allTasks, query);
    
    expect(filteredTasks.length).toBeGreaterThan(0);
    expect(filteredTasks.every(task => task.status === 'complete')).toBe(true);
  });
  
  test('queryTasks with not done filter should return only incomplete tasks', async () => {
    const allTasks = await findAllTasks(testVaultPath);
    const query = 'not done';
    const filteredTasks = queryTasks(allTasks, query);
    
    expect(filteredTasks.length).toBeGreaterThan(0);
    expect(filteredTasks.every(task => task.status === 'incomplete')).toBe(true);
  });
  
  test('queryTasks with tag filters should work correctly', async () => {
    const allTasks = await findAllTasks(testVaultPath);
    
    // Tasks with tags
    const tasksWithTags = queryTasks(allTasks, 'has tags');
    expect(tasksWithTags.length).toBeGreaterThan(0);
    expect(tasksWithTags.every(task => task.tags && task.tags.length > 0)).toBe(true);
    
    // Tasks without tags
    const tasksWithoutTags = queryTasks(allTasks, 'no tags');
    expect(tasksWithoutTags.every(task => task.tags.length === 0)).toBe(true);
  });
  
  test('queryTasks with due date filters should work correctly', async () => {
    const allTasks = await findAllTasks(testVaultPath);
    
    // Tasks with due dates
    const tasksWithDueDate = queryTasks(allTasks, 'has due date');
    expect(tasksWithDueDate.length).toBeGreaterThan(0);
    expect(tasksWithDueDate.every(task => task.dueDate !== undefined)).toBe(true);
    
    // Tasks without due dates
    const tasksWithoutDueDate = queryTasks(allTasks, 'no due date');
    expect(tasksWithoutDueDate.every(task => task.dueDate === undefined)).toBe(true);
  });
  
  test('queryTasks with priority filters should work correctly', async () => {
    const allTasks = await findAllTasks(testVaultPath);
    
    // High priority tasks
    const highPriorityTasks = queryTasks(allTasks, 'priority is high');
    expect(highPriorityTasks.length).toBeGreaterThan(0);
    expect(highPriorityTasks.every(task => task.priority === 'high')).toBe(true);
  });
  
  test('queryTasks with multiple filters should use AND logic', async () => {
    const allTasks = await findAllTasks(testVaultPath);
    
    // High priority incomplete tasks
    const query = `not done
priority is high`;
    
    const filteredTasks = queryTasks(allTasks, query);
    
    expect(filteredTasks.length).toBeGreaterThan(0);
    expect(filteredTasks.every(task => 
      task.status === 'incomplete' && task.priority === 'high'
    )).toBe(true);
  });
  
  test('queryTasks with description filters should work correctly', async () => {
    const allTasks = await findAllTasks(testVaultPath);
    
    // Tasks with specific text in description
    const tasksWithText = queryTasks(allTasks, 'description includes priority');
    expect(tasksWithText.length).toBeGreaterThan(0);
    expect(tasksWithText.every(task => 
      task.description.toLowerCase().includes('priority')
    )).toBe(true);
    
    // Tasks without specific text
    const tasksWithoutText = queryTasks(allTasks, 'description does not include priority');
    expect(tasksWithoutText.every(task => 
      !task.description.toLowerCase().includes('priority')
    )).toBe(true);
  });

  test('queryTasks with due date equals should return tasks due on that date', async () => {
    const allTasks = await findAllTasks(testVaultPath);
    const targetDate = '2025-04-18';
    const query = `due on ${targetDate}`;

    const filteredTasks = queryTasks(allTasks, query);

    expect(filteredTasks.length).toBeGreaterThan(0);
    expect(filteredTasks.every(task => task.dueDate === targetDate)).toBe(true);
  });

  test('queryTasks with inclusive due filters should include boundary date', async () => {
    const allTasks = await findAllTasks(testVaultPath);

    // on or before 2025-04-18 should include tasks due 2025-04-18 and earlier
    const onOrBefore = queryTasks(allTasks, 'due on or before 2025-04-18');
    // Debug context to understand failures
    // eslint-disable-next-line no-console
    console.log('All due dates:', allTasks.filter(t => t.dueDate).map(t => t.dueDate));
    // eslint-disable-next-line no-console
    console.log('onOrBefore count:', onOrBefore.length);
    expect(onOrBefore.length).toBeGreaterThan(0);
    expect(onOrBefore.every(task => task.dueDate && task.dueDate <= '2025-04-18')).toBe(true);

    // on or after 2025-04-17 should include tasks due 2025-04-17 and later
    const onOrAfter = queryTasks(allTasks, 'due on or after 2025-04-17');
    expect(onOrAfter.length).toBeGreaterThan(0);
    expect(onOrAfter.every(task => task.dueDate && task.dueDate >= '2025-04-17')).toBe(true);
  });

  test('queryTasks with start date equals should return tasks starting on that date', async () => {
    const allTasks = await findAllTasks(testVaultPath);
    const targetDate = '2025-04-25';
    const query = `starts on ${targetDate}`;

    const filteredTasks = queryTasks(allTasks, query);

    expect(filteredTasks.length).toBeGreaterThan(0);
    expect(filteredTasks.every(task => task.startDate === targetDate)).toBe(true);
  });

  test('queryTasks supports "starts today" (dynamic)', async () => {
    const today = moment().format('YYYY-MM-DD');
    const tempFile = path.join(testVaultPath, 'starts-today.temp.md');
    const content = `# Temp file for starts today test\n- [ ] Thing to do 🛫 ${today}`;

    try {
      await fs.writeFile(tempFile, content, 'utf-8');
      const allTasks = await findAllTasks(testVaultPath);
      const filteredTasks = queryTasks(allTasks, 'starts today');

      expect(filteredTasks.length).toBeGreaterThan(0);
      expect(filteredTasks.every(task => task.startDate === today)).toBe(true);
    } finally {
      // Cleanup so other tests are not affected
      try { await fs.unlink(tempFile); } catch {}
    }
  });

  test('queryTasks supports OR with inclusive date phrases', async () => {
    const tempFile = path.join(testVaultPath, 'or-inclusive.temp.md');
    const content = `# Temp file for OR inclusive test\n- [ ] Far future due only 🗓️ 2099-01-01\n- [ ] Old start only 🛫 2000-01-01`;
    try {
      await fs.writeFile(tempFile, content, 'utf-8');
      const allTasks = await findAllTasks(testVaultPath);
      const query = 'due on or before 2000-01-01 or starts on or before 2000-01-01';
      const filtered = queryTasks(allTasks, query);

      expect(filtered.length).toBeGreaterThan(0);
      // Must include the start-only task
      expect(filtered.some(t => t.startDate === '2000-01-01')).toBe(true);
      // And no need to include the far future due-only task
      expect(filtered.some(t => t.description.includes('Far future due only'))).toBe(false);
      // Sanity: every match satisfies at least one side of the OR
      expect(filtered.every(t => (t.dueDate && t.dueDate <= '2000-01-01') || (t.startDate && t.startDate <= '2000-01-01'))).toBe(true);
    } finally {
      try { await fs.unlink(tempFile); } catch {}
    }
  });
});
import { queryTasks } from '../src/index.js';
import { applyFilter, parseTaskLine, Task } from '../src/TaskParser.js';

// Sample tasks for testing
const testTasks = [
  `- [ ] Basic task`,
  `- [ ] Task with #tag`,
  `- [ ] Task with high priority ⏫`,
  `- [ ] Task due today 🗓️ 2025-04-18`,
  `- [ ] Task due today 📅 2025-04-18`, // The correct emoji for the ootb tasks plugin
  `- [x] Completed task`,
  `- [ ] Task in another file`
];

// Parse the test tasks
const tasks = testTasks.map((line, index) => 
  parseTaskLine(line, `/path/to/file${index < 5 ? '1' : '2'}.md`, index)
).filter(task => task !== null) as Task[];

describe('Task Parsing and Filtering', () => {
  // Disable the server auto-start for tests
  process.env.DISABLE_SERVER = 'true';
  
  test('parseTaskLine should parse tasks correctly', () => {
    // Check that we parsed the expected number of tasks
    expect(tasks.length).toBe(7);
    
    // Check that task properties are set correctly
    expect(tasks[0].description).toBe('Basic task');
    expect(tasks[0].status).toBe('incomplete');
    
    // Task with tag
    expect(tasks[1].tags).toContainEqual('#tag');
    
    // Task with priority
    expect(tasks[2].priority).toBe('high');
    
    // Task with due date
    expect(tasks[3].dueDate).toBe('2025-04-18');

     // Task with due date
    expect(tasks[4].dueDate).toBe('2025-04-18');
    
    // Completed task
    expect(tasks[5].status).toBe('complete');
  });
  
  test('applyFilter should filter tasks by done status', () => {
    // Test done filter
    const doneResults = tasks.filter(task => applyFilter(task, 'done'));
    expect(doneResults.length).toBe(1);
    expect(doneResults[0].status).toBe('complete');
    
    // Test not done filter
    const notDoneResults = tasks.filter(task => applyFilter(task, 'not done'));
    expect(notDoneResults.length).toBe(6);
    expect(notDoneResults.every(task => task.status === 'incomplete')).toBe(true);
  });
  
  test('applyFilter should filter tasks by tags', () => {
    // Test has tag filter
    const hasTagResults = tasks.filter(task => applyFilter(task, 'has tag tag'));
    expect(hasTagResults.length).toBe(1);
    expect(hasTagResults[0].tags).toContainEqual('#tag');
    
    // Test has tags filter
    const hasTagsResults = tasks.filter(task => applyFilter(task, 'has tags'));
    expect(hasTagsResults.length).toBe(1);
    
    // Test no tags filter - we assume tasks[0], tasks[2], tasks[3], tasks[4], tasks[5] have no tags
    const noTagsResults = tasks.filter(task => task !== tasks[1]);
    const noTagsFilterResults = tasks.filter(task => applyFilter(task, 'no tags'));
    // Just check all tasks without tags are flagged as having no tags
    expect(noTagsFilterResults.length).toBe(noTagsResults.length);
  });
  
  test('applyFilter should filter tasks by description', () => {
    // Test description includes filter
    const descriptionResults = tasks.filter(task => 
      applyFilter(task, 'description includes priority')
    );
    expect(descriptionResults.length).toBe(1);
    expect(descriptionResults[0].description).toContain('priority');
    
    // Test description does not include filter
    const notDescriptionResults = tasks.filter(task => 
      applyFilter(task, 'description does not include priority')
    );
    expect(notDescriptionResults.length).toBe(6);
    expect(notDescriptionResults.every(task => !task.description.includes('priority'))).toBe(true);
  });
  
  test('applyFilter should filter tasks by file path', () => {
    // Test path includes filter
    const file1Results = tasks.filter(task => applyFilter(task, 'path includes file1'));
    expect(file1Results.length).toBe(5);
    
    const file2Results = tasks.filter(task => applyFilter(task, 'path includes file2'));
    expect(file2Results.length).toBe(2);
  });
  
  test('queryTasks should apply multiple filters with AND logic', () => {
    const multiFilterQuery = `not done
    path includes file1`;
    
    const result = queryTasks(tasks, multiFilterQuery);
    expect(result.length).toBe(5);
    expect(result.every(task => 
      task.status === 'incomplete' && task.filePath.includes('file1')
    )).toBe(true);
  });
});
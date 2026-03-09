# Dataview Format Tasks for Testing

## Tasks with Dataview inline fields
- [ ] Task with due date [due:: 2025-01-15]
- [ ] Task with scheduled date [scheduled:: 2025-01-20]
- [ ] Task with start date [start:: 2025-01-10]
- [ ] Task with created date [created:: 2025-01-01]
- [ ] Task with high priority [priority:: high]
- [ ] Task with medium priority [priority:: medium]
- [ ] Task with low priority [priority:: low]
- [ ] Task with highest priority [priority:: highest]
- [ ] Task with lowest priority [priority:: lowest]
- [ ] Task with recurrence [repeat:: every week]
- [ ] Task with multiple fields [due:: 2025-02-14] [priority:: high] #important
- [ ] Task with both emoji and Dataview 📅 2025-03-01 [priority:: medium]

## Completed tasks with Dataview fields
- [x] Completed task with due date [due:: 2025-01-05] [completion:: 2025-01-04]
- [x] Completed task with priority [priority:: high] [completion:: 2025-01-03]

## Mixed format tasks
- [ ] Task with emoji due and Dataview priority 🗓️ 2025-04-01 [priority:: high]
- [ ] Task with Dataview due and emoji priority [due:: 2025-05-01] ⏫
- [ ] Complex task #project [due:: 2025-06-15] [scheduled:: 2025-06-01] [priority:: medium] with description

## Tasks without dates (for testing no due date filter)
- [ ] Simple task without any dates
- [ ] Task with priority but no date [priority:: low]
# EVENT SOURCING GUIDE

## Core Idea
System truth = events

## Rules
- Events are immutable
- Append-only
- Persist before publish

## Flow
Command → Event → Store → Read model

## Events
- BatchStarted
- BatchCompleted
- DowntimeStarted
- DowntimeEnded
- QualityRecorded

## Anti-patterns
- Updating rows instead of events
- Storing KPI as truth

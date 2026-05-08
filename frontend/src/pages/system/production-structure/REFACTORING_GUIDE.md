# Production Structure Page Refactoring - Documentation

## Overview

The `ProductionStructurePage.tsx` has been refactored from a 935-line monolithic component into a clean, modular architecture with separation of concerns. This document explains the new structure, benefits, and guidelines for maintaining and extending it.

## Architecture Changes

### Before Refactoring
- **File Size**: 935 lines in a single file
- **Concerns Mixed**: Tree navigation, entity editing, UI components, utilities, constants all in one file
- **Reusability**: Low - components tightly coupled, difficult to extract or reuse
- **Maintainability**: Difficult - large component hard to navigate and understand

### After Refactoring
- **Files**: 11 new organized files across config, components, and utilities
- **Separation**: Clear separation of concerns (config, utilities, components, pages)
- **Reusability**: High - components are pure, focused, and can be used elsewhere
- **Maintainability**: Excellent - each file has a single responsibility

## New File Structure

```
production-structure/
├── config/                          # Configuration and utilities
│   ├── index.ts                     # Main exports
│   ├── entityConfig.ts              # Constants for entity types, icons, routes
│   └── treeUtils.ts                 # Tree navigation utility functions
├── components/                      # Reusable React components
│   ├── index.ts                     # Component exports
│   ├── FormFields.tsx               # Form input components (FormField, EditableField, SelectField)
│   ├── NodeDetailPanel.tsx          # Right panel for viewing/editing selected entity
│   ├── TreeNodeComponent.tsx        # Individual tree node rendering
│   ├── TreeNavigation.tsx           # Left sidebar tree navigation
│   ├── [existing components]        # DataCard, Toolbar, SummaryBlock, etc.
│   └── ...
├── [pages]                          # Independent pages (PlantStructurePage, etc.)
└── [main orchestrator]              # ProductionStructurePage.tsx (simplified)
```

## Component Descriptions

### Config Layer

#### `entityConfig.ts` - Entity Constants
- **Exports**: ENTITY_CONFIG, TYPE_TITLES, CHILD_TYPE_MAP, ENTITY_ROUTES, ADD_ROUTES
- **Purpose**: Centralized configuration for entity types (Plant, Department, Resource, etc.)
- **Benefits**: Single source of truth for icons, colors, labels, and routing
- **Usage**: Imported by components that need entity styling or routing info

#### `treeUtils.ts` - Tree Navigation Utilities
- **Exports**: findNodeByKey, findNodePathByKey, formatStatusLabel, countActiveInactive, countEntityTypes
- **Purpose**: Tree manipulation functions used across components
- **Benefits**: Reusable, testable utilities; no component coupling
- **Usage**: Called by ProductionStructurePage and TreeNavigation components

### Component Layer

#### `FormFields.tsx` - Reusable Form Components
- **Components**: 
  - `FormField`: Basic text input with label
  - `EditableField`: Enhanced input with readonly state and styling
  - `SelectField`: Dropdown select with options
- **Purpose**: Form UI building blocks
- **Benefits**: Consistency across all forms; easy to style uniformly
- **Usage**: Used in NodeDetailPanel for entity editing

#### `TreeNodeComponent.tsx` - Single Tree Node
- **Props**: TreeNodeProps (node, nodeKey, depth, expanded, selected, etc.)
- **Purpose**: Renders a single tree node with expansion, selection, styling
- **Benefits**: Pure component - no side effects, fully controlled by parent
- **Features**:
  - Recursive rendering for nested children
  - Icon and status display
  - Selection highlighting
  - Context menu integration
  - Keyboard support (Enter to select/expand)

#### `TreeNavigation.tsx` - Left Sidebar
- **Props**: TreeNavigationProps (data, selectedKey, expandedSet, search, callbacks)
- **Purpose**: Left sidebar tree navigation interface
- **Features**:
  - Search input with live filtering
  - Tree node rendering via TreeNodeComponent
  - Empty state handling
  - Loading state support
- **Benefits**: Fully composable - accepts all state as props, calls back with changes

#### `NodeDetailPanel.tsx` - Right Panel
- **Modes**: view, edit, create
- **Components**:
  - Title Header: Shows entity name, type, code, status, depth
  - Toolbar: Action buttons (Add, Edit, Save, Cancel, Close)
  - Content Area: ViewContent (summary, stats) or FormContent (edit/create)
- **Features**:
  - Multi-mode operation (view/edit/create)
  - Automatic status formatting
  - Active/inactive child counting
  - Form field rendering
- **Benefits**: Handles all entity detail interactions in one place

### Main Orchestrator

#### `ProductionStructurePage.tsx` - Orchestration Component
- **Responsibility**: State management and component coordination
- **Size**: ~150 lines (vs 935 before)
- **State Managed**:
  - `expandedSet`: Set of expanded tree node keys
  - `selectedNodeKey`: Currently selected entity key
  - `workspaceMode`: 'view' | 'edit' | 'create'
  - `searchQuery`: Tree search filter
  - `createType`: Type of entity being created
  - `contextMenu`: Right-click menu state
- **Data Flow**: 
  1. Fetches company data and overview via GraphQL
  2. Passes tree data to TreeNavigation
  3. Finds selected node and passes to NodeDetailPanel
  4. Handles callbacks and updates state
  5. Renders ContextMenuComponent for right-click operations

## Design Patterns Used

### 1. **Controlled Components**
All components are controlled by parent state:
```typescript
// ✅ Good - parent controls state
<TreeNavigation
  data={treeData}
  selectedKey={selectedNodeKey}
  expandedSet={expandedSet}
  onSelectNode={setSelectedNodeKey}
  onToggleNode={toggleExpanded}
/>

// ❌ Avoid - component managing own state
<TreeNavigation data={treeData} />
```

### 2. **Props-Based Configuration**
Components configured entirely through props - no implicit behavior:
```typescript
interface TreeNavigationProps {
  data: DataManagementTreeChild[];
  selectedKey: string | null;
  expandedSet: Set<string>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleNode: (key: string) => void;
  onSelectNode: (key: string | null) => void;
  onContextMenu: (e: React.MouseEvent, key: string, node) => void;
  isLoading?: boolean;
}
```

### 3. **Callback-Based Communication**
Components communicate via callbacks, not direct manipulation:
```typescript
// ✅ Good
onSelectNode={(key) => setSelectedNodeKey(key)}

// ❌ Avoid
selectedNodeKey.current = key  // Direct manipulation
```

### 4. **Single Responsibility**
Each file has one purpose:
- `TreeNavigation` = only tree display and search
- `NodeDetailPanel` = only entity detail viewing/editing
- `TreeNodeComponent` = only individual node rendering
- `entityConfig.ts` = only configuration constants

## Usage Guidelines

### Adding a New Entity Type

1. **Add to `entityConfig.ts`**:
```typescript
export const ENTITY_CONFIG: Record<string, EntityConfigItem> = {
  // ... existing entries
  newType: {
    icon: NewIcon,
    color: "text-new-600 bg-new-50 dark:text-new-400 dark:bg-new-500/10",
    borderTop: "border-t-new-400",
    label: "New Entity Type",
  },
};

export const TYPE_TITLES: Record<string, string> = {
  // ... existing entries
  newType: "New Entity Type",
};

export const CHILD_TYPE_MAP: Record<string, string> = {
  // ... existing entries
  parent: "New Entity Type",  // What parent creates
};
```

2. **Add routes**:
```typescript
export const ENTITY_ROUTES: Record<string, string> = {
  // ...
  newType: "/system/production-structure/new-types/",
};

export const ADD_ROUTES: Record<string, string> = {
  // ...
  parent: "/system/production-structure/new-type",
};
```

3. **Create independent page** (if needed):
```typescript
// ProductionStructurePage/NewTypesPage.tsx
export function NewTypesPage() {
  // Implementation with consistent header/toolbar structure
}
```

### Extending Components

**Adding new fields to entity edit form**:
```typescript
// In NodeDetailPanel.tsx ViewContent or edit section
<FormField label="New Field" value={selectedNode.newField || ""} />
```

**Customizing tree node appearance**:
```typescript
// In TreeNodeComponent.tsx render logic
{node.customAttribute && <CustomBadge value={node.customAttribute} />}
```

### Creating New Modular Components

When creating new components:

1. **Define props interface**:
```typescript
export interface MyComponentProps {
  data: SomeType;
  onAction: (id: string) => void;
  // All state passed as props
}
```

2. **Keep component pure**:
- No useState for derived data
- No side effects except rendering
- All state comes from props

3. **Export interface and component**:
```typescript
export { MyComponent };
export type { MyComponentProps };
```

4. **Add to components/index.ts**:
```typescript
export { MyComponent } from "./MyComponent";
export type { MyComponentProps } from "./MyComponent";
```

## Best Practices

### ✅ DO

- Keep components focused and reusable
- Use TypeScript interfaces for all props
- Pass all state as props (controlled components)
- Use callbacks for parent-child communication
- Extract utility functions to utilities file
- Document component responsibilities in comments
- Keep constants in centralized config files
- Use meaningful component and file names

### ❌ DON'T

- Mix concerns in single component (UI, data, business logic)
- Use useState for state that should come from parent
- Directly manipulate parent state from child
- Create components with "magic" behavior
- Put configuration inline - use config files
- Create monolithic components over ~200 lines
- Hardcode values - use constants or props

## Testing

Since components are controlled and pure:

```typescript
// Components are easy to test - just pass props and check render
<TreeNavigation
  data={mockTreeData}
  selectedKey="plant:1"
  expandedSet={new Set(["plant:1"])}
  // ... etc
/>
```

Utilities are testable independently:
```typescript
const node = findNodeByKey(mockData, "plant:1/department:2");
expect(node.name).toBe("Expected Name");
```

## Performance Considerations

1. **Memoization**: Use `useMemo` in components that compute derived values
   ```typescript
   const activeInactiveCounts = useMemo(() => {
     return countActiveInactive(selectedNode);
   }, [selectedNode]);
   ```

2. **Callback Memoization**: Use `useCallback` for event handlers
   ```typescript
   const handleSelectNode = useCallback((key) => {
     setSelectedNodeKey(key);
   }, []);
   ```

3. **Avoid Inline Functions**: Don't create functions in render
   ```typescript
   // ❌ Bad - new function every render
   onSelectNode={(key) => { setSelectedNodeKey(key); }}
   
   // ✅ Good - memoized callback
   const handleSelectNode = useCallback(setSelectedNodeKey, []);
   <TreeNavigation onSelectNode={handleSelectNode} />
   ```

## Future Improvements

1. **Virtual Scrolling**: For large tree lists, implement virtual scrolling
2. **Keyboard Navigation**: Add arrow key navigation in tree
3. **Drag & Drop**: Allow reordering entities by dragging
4. **Undo/Redo**: Implement undo stack for edits
5. **Bulk Operations**: Select multiple entities and perform actions
6. **Advanced Search**: Add filter by status, type, code
7. **Favorites/Bookmarks**: Pin frequently used entities
8. **Accessibility**: Add ARIA labels and keyboard support enhancements

## Related Files

- **Existing independent pages**: PlantStructurePage, DepartmentsPage, ResourcesPage, etc.
- **Shared components**: components/ folder has DataCard, Toolbar, SummaryBlock, etc.
- **GraphQL queries**: graphql/dataManagementQueries.ts
- **Hooks**: hooks/useDataManagementOverview.ts
- **Styles**: styles/themeTokens.ts

## Questions & Support

For questions about the refactored structure:
1. Check this documentation first
2. Review component props interfaces
3. Look at component usage in ProductionStructurePage.tsx
4. Check copilot-instructions.md for project conventions

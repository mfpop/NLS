/**
 * LeanSynk Production Structure - Architecture Diagram
 * 
 * ================================================================================
 *                          DATA FLOW ARCHITECTURE
 * ================================================================================
 * 
 * 
 *                        ┌─────────────────────┐
 *                        │  GraphQL Server     │
 *                        │  (Django Backend)   │
 *                        └──────────┬──────────┘
 *                                   │
 *                    ┌──────────────┼──────────────┐
 *                    │              │              │
 *            ┌───────▼────────┐  ┌──▼──────────┐  │
 *            │ COMPANY_QUERY  │  │ CONFIG_OPTS │  │
 *            └────────────────┘  └─────────────┘  │
 *                    │                             │
 *         ┌──────────┴─────────────────────────────┼────────┐
 *         │                                        │        │
 *    ┌────▼──────────────────────────────────────────────────▼──────┐
 *    │     ProductionStructurePage.tsx (MAIN ORCHESTRATOR)         │
 *    │     ─────────────────────────────────────────────────────   │
 *    │  State Management:                                           │
 *    │  • expandedSet: Set<string>         → Expanded tree nodes   │
 *    │  • selectedNodeKey: string | null   → Current entity        │
 *    │  • workspaceMode: 'view'|'edit'|'create'                   │
 *    │  • searchQuery: string              → Tree search filter    │
 *    │  • createType: string               → Entity type creating  │
 *    │  • contextMenu: ContextMenuState    → Right-click menu      │
 *    │                                                              │
 *    │  Data Sources:                                               │
 *    │  • useQuery(COMPANY_QUERY)          → Company config        │
 *    │  • useQuery(CONFIG_OPTIONS_QUERY)   → System config        │
 *    │  • useDataManagementOverview({})    → Tree structure        │
 *    └──┬────────────────────────┬─────────────────┬──────────────┘
 *       │                        │                 │
 *       │                        │                 │
 * ┌─────▼────────┐    ┌──────────▼──────┐  ┌──────▼────────────────┐
 * │ TreeNavigation│    │NodeDetailPanel  │  │ContextMenuComponent  │
 * │  (LEFT PANEL) │    │ (RIGHT PANEL)   │  │  (RIGHT-CLICK)       │
 * │               │    │                 │  │                      │
 * │ • Search bar  │    │ • Title header  │  │ • Add Child          │
 * │ • Tree nodes  │    │ • Toolbar       │  │ • Edit               │
 * │ • Expand/     │    │ • View content  │  │ • Delete             │
 * │   collapse    │    │ • Edit form     │  │                      │
 * │ • Selection   │    │ • Create form   │  └──────────────────────┘
 * └─────┬────────┘    └────────┬────────┘
 *       │                      │
 *    ┌──▼──────────────────────▼──────────┐
 *    │    Component & Config Layers       │
 *    │    ───────────────────────────────  │
 *    │                                     │
 *    │  ┌─────────────────────────────┐   │
 *    │  │  config/entityConfig.ts     │   │
 *    │  │  ─────────────────────────  │   │
 *    │  │ • ENTITY_CONFIG (icons,     │   │
 *    │  │   colors, labels)           │   │
 *    │  │ • TYPE_TITLES               │   │
 *    │  │ • CHILD_TYPE_MAP            │   │
 *    │  │ • ENTITY_ROUTES             │   │
 *    │  │ • ADD_ROUTES                │   │
 *    │  └─────────────────────────────┘   │
 *    │                                     │
 *    │  ┌─────────────────────────────┐   │
 *    │  │  config/treeUtils.ts        │   │
 *    │  │  ─────────────────────────  │   │
 *    │  │ • findNodeByKey()           │   │
 *    │  │ • findNodePathByKey()       │   │
 *    │  │ • formatStatusLabel()       │   │
 *    │  │ • countActiveInactive()     │   │
 *    │  │ • countEntityTypes()        │   │
 *    │  └─────────────────────────────┘   │
 *    │                                     │
 *    │  ┌─────────────────────────────┐   │
 *    │  │  components/FormFields.tsx  │   │
 *    │  │  ─────────────────────────  │   │
 *    │  │ • FormField                 │   │
 *    │  │ • EditableField             │   │
 *    │  │ • SelectField               │   │
 *    │  └─────────────────────────────┘   │
 *    │                                     │
 *    │  ┌─────────────────────────────┐   │
 *    │  │  components/TreeNode        │   │
 *    │  │  Component.tsx              │   │
 *    │  │  ─────────────────────────  │   │
 *    │  │ • Individual node render    │   │
 *    │  │ • Recursive children        │   │
 *    │  │ • Selection styling         │   │
 *    │  └─────────────────────────────┘   │
 *    │                                     │
 *    │  ┌─────────────────────────────┐   │
 *    │  │  components/                │   │
 *    │  │  TreeNavigation.tsx         │   │
 *    │  │  ─────────────────────────  │   │
 *    │  │ • Tree rendering            │   │
 *    │  │ • Search filtering          │   │
 *    │  │ • Empty state               │   │
 *    │  └─────────────────────────────┘   │
 *    │                                     │
 *    │  ┌─────────────────────────────┐   │
 *    │  │  components/                │   │
 *    │  │  NodeDetailPanel.tsx        │   │
 *    │  │  ─────────────────────────  │   │
 *    │  │ • Entity viewing            │   │
 *    │  │ • Entity editing            │   │
 *    │  │ • Entity creation           │   │
 *    │  └─────────────────────────────┘   │
 *    │                                     │
 *    └─────────────────────────────────────┘
 *
 *
 * ================================================================================
 *                         STATE UPDATE FLOW
 * ================================================================================
 *
 * User Action          Component              ProductionStructurePage
 * ──────────────       ──────────────         ──────────────────────
 * Click tree node  →  onSelectNode(key)   →  setSelectedNodeKey(key)
 *                                         →  Update selected entity
 *                                         →  Pass to NodeDetailPanel
 *
 * Expand node      →  onToggleNode(key)   →  updateExpandedSet(key)
 *                                         →  Show/hide children
 *
 * Click Edit       →  onModeChange('edit')→  setWorkspaceMode('edit')
 *                                         →  NodeDetailPanel shows form
 *
 * Type to search   →  onSearchChange(q)   →  setSearchQuery(q)
 *                                         →  Filter tree results
 *
 * Right-click      →  onContextMenu(e,k)  →  setContextMenu(...)
 *                                         →  Show context menu
 *
 *
 * ================================================================================
 *                      COMPONENT HIERARCHY
 * ================================================================================
 *
 *  ProductionStructurePage
 *  │
 *  ├─ TreeNavigation
 *  │  │
 *  │  └─ TreeNodeComponent (recursive)
 *  │     ├─ TreeNodeComponent (children)
 *  │     │  └─ TreeNodeComponent (children)
 *  │     │     └─ ...
 *  │     └─ TreeNodeComponent (siblings)
 *  │
 *  ├─ NodeDetailPanel
 *  │  ├─ ViewContent
 *  │  │  └─ (Display entity info)
 *  │  │
 *  │  └─ FormContent
 *  │     └─ FormFields
 *  │        ├─ FormField
 *  │        ├─ EditableField
 *  │        └─ SelectField
 *  │
 *  └─ ContextMenuComponent
 *     └─ (Right-click options)
 *
 *
 * ================================================================================
 *                         DATA STRUCTURE
 * ================================================================================
 *
 * Tree Structure (from GraphQL):
 * ─────────────────────────────
 * {
 *   id: string,
 *   type: "company" | "plant" | "productionLine" | "department" | ...,
 *   name: string,
 *   code: string,
 *   status: "active" | "inactive",
 *   childCount: number,
 *   children: DataManagementTreeChild[] // recursive
 * }
 *
 * Node Key Format (for tree navigation):
 * ──────────────────────────────────────
 * Root level:      "type:id"
 * Child level:     "parent_type:parent_id/type:id"
 * Deep nesting:    "type1:id1/type2:id2/type3:id3"
 *
 * Examples:
 * - "company:1"
 * - "plant:42"
 * - "plant:42/department:7"
 * - "plant:42/department:7/resourceGroup:13"
 *
 *
 * ================================================================================
 *                      STYLING APPROACH
 * ================================================================================
 *
 * Entity Type Styling (from entityConfig.ts):
 * ────────────────────────────────────────────
 * Company:           Factory icon    → Emerald   (green)
 * Plant:             Building2 icon  → Blue
 * ProductionLine:    GitBranch icon  → Amber     (orange)
 * Department:        Layers icon     → Purple
 * ResourceGroup:     Users icon      → Blue
 * Resource:          Monitor icon    → Gray
 *
 * Each entity has:
 * • Icon (from lucide-react)
 * • Color palette (text + background + dark mode variants)
 * • Border color (for visual separation)
 * • Label (human-readable name)
 *
 *
 * ================================================================================
 *                         FILE TREE
 * ================================================================================
 *
 * src/pages/system/
 * ├── ProductionStructurePage.tsx
 * │   └─ Main orchestrator component (140 lines)
 * │
 * └── production-structure/
 *     │
 *     ├── config/
 *     │   ├── index.ts              ← Export all config
 *     │   ├── entityConfig.ts       ← Entity constants
 *     │   └── treeUtils.ts          ← Utility functions
 *     │
 *     ├── components/
 *     │   ├── index.ts              ← Component exports
 *     │   ├── FormFields.tsx        ← Form inputs ✨ NEW
 *     │   ├── NodeDetailPanel.tsx   ← Detail panel ✨ NEW
 *     │   ├── TreeNavigation.tsx    ← Tree sidebar ✨ NEW
 *     │   ├── TreeNodeComponent.tsx ← Tree nodes ✨ NEW
 *     │   ├── DataCard.tsx          ← Existing
 *     │   ├── Toolbar.tsx           ← Existing
 *     │   ├── SummaryBlock.tsx      ← Existing
 *     │   └── ...
 *     │
 *     ├── [Page Files]
 *     │   ├── PlantStructurePage.tsx
 *     │   ├── DepartmentsPage.tsx
 *     │   ├── ResourcesPage.tsx
 *     │   └── ...
 *     │
 *     ├── REFACTORING_GUIDE.md    ← Architecture docs
 *     └── shared.tsx               ← Shared utilities
 *
 * ✨ = Newly created in refactoring
 *
 *
 * ================================================================================
 */

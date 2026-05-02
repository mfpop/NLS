export interface AppState {
  isSidebarOpen: boolean;
  activePlantId: string | null;
}

export const INITIAL_APP_STATE: AppState = {
  isSidebarOpen: true,
  activePlantId: null,
};

export type AppAction =
  | { type: "toggleSidebar" }
  | { type: "setActivePlantId"; payload: string | null };

export function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "toggleSidebar":
      return { ...state, isSidebarOpen: !state.isSidebarOpen };
    case "setActivePlantId":
      return { ...state, activePlantId: action.payload };
    default:
      return state;
  }
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolbarProvider } from "../production-structure/components/ToolbarContext";

// ── Hoisted mocks ──────────────────────────────────────────
const { mockUseQuery, mockUseMutation } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
}));

vi.mock("lucide-react", () => {
  return new Proxy(
    {},
    {
      get(_, name: string) {
        return (props: Record<string, unknown>) =>
          <span data-testid={`icon-${name}`} {...props} />;
      },
    },
  );
});

// ── Test data ──────────────────────────────────────────────

const MOCK_PLANTS = [
  { id: "p1", code: "PLANT-A", name: "Plant Alpha" },
  { id: "p2", code: "PLANT-B", name: "Plant Beta" },
];

const MOCK_WAREHOUSES = [
  {
    id: "wh1",
    plantId: "p1",
    plantName: "Plant Alpha",
    code: "WH-MAIN",
    name: "Main Warehouse",
    warehouseType: "RM",
    location: "Building A",
    isActive: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-03-01T08:30:00Z",
  },
  {
    id: "wh2",
    plantId: "p1",
    plantName: "Plant Alpha",
    code: "WH-FG",
    name: "Finished Goods",
    warehouseType: "FG",
    location: "Building B",
    isActive: true,
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-03-10T08:30:00Z",
  },
  {
    id: "wh3",
    plantId: "p2",
    plantName: "Plant Beta",
    code: "WH-SCRAP",
    name: "Scrap Yard",
    warehouseType: "SCRAP",
    location: "Yard C",
    isActive: false,
    createdAt: "2024-01-20T10:00:00Z",
    updatedAt: "2024-02-15T08:30:00Z",
  },
  {
    id: "wh4",
    plantId: "p2",
    plantName: "Plant Beta",
    code: "WH-WIP",
    name: "WIP Storage",
    warehouseType: "WIP",
    location: "Building D",
    isActive: true,
    createdAt: "2024-03-01T10:00:00Z",
    updatedAt: "2024-03-20T08:30:00Z",
  },
];

const DEFAULT_QUERY_RETURN = {
  data: { warehouses: MOCK_WAREHOUSES, plants: MOCK_PLANTS },
  loading: false,
  refetch: vi.fn().mockResolvedValue({}),
};

const LOADING_QUERY_RETURN = {
  data: null,
  loading: true,
  refetch: vi.fn(),
};

// ── Helpers ────────────────────────────────────────────────

function renderPage(queryReturn = DEFAULT_QUERY_RETURN) {
  mockUseQuery.mockReturnValue(queryReturn);
  mockUseMutation.mockReset();
  mockUseMutation.mockReturnValue([vi.fn().mockResolvedValue({ data: { ok: true } }), { loading: false }]);

  return render(
    <ToolbarProvider>
      <div style={{ height: "800px", display: "flex", flexDirection: "column" }}>
        <WarehousesPage />
      </div>
    </ToolbarProvider>,
  );
}

// Import AFTER mocks are set up
import { WarehousesPage } from "./WarehousesPage";

// ── Tests ──────────────────────────────────────────────────

describe("WarehousesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page header with title and subtitle", () => {
    renderPage(LOADING_QUERY_RETURN as any);
    expect(screen.getByText("Warehouses")).toBeInTheDocument();
    expect(screen.getByText(/Manage warehouse locations across plants/i)).toBeInTheDocument();
  });

  it("shows loading state while data is being fetched", () => {
    renderPage(LOADING_QUERY_RETURN as any);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no warehouses exist", async () => {
    renderPage({
      ...DEFAULT_QUERY_RETURN,
      data: { warehouses: [], plants: MOCK_PLANTS },
    });
    await waitFor(() => {
      expect(screen.getByText(/No warehouses/i)).toBeInTheDocument();
    });
  });

  it("renders the warehouse list with plant groups", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Plant Alpha/i)).toBeInTheDocument();
      expect(screen.getByText(/Plant Beta/i)).toBeInTheDocument();
      expect(screen.getByText(/WH-MAIN/i)).toBeInTheDocument();
      expect(screen.getByText(/WH-SCRAP/i)).toBeInTheDocument();
    });
  });

  it("shows correct warehouse count in footer", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/4 warehouses/i)).toBeInTheDocument();
    });
  });

  it("opens the create form when New is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("New")).toBeInTheDocument());
    await user.click(screen.getByText("New"));

    expect(screen.getByPlaceholderText("Name *")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Code *")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("New Warehouse")).toBeInTheDocument();
  });

  it("shows validation errors when saving with empty required fields", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("New")).toBeInTheDocument());
    await user.click(screen.getByText("New"));
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Required")).toBeInTheDocument();
    });
    const requiredErrors = screen.getAllByText("Required");
    expect(requiredErrors.length).toBeGreaterThanOrEqual(1);
  });

  it("creates a new warehouse successfully", async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn().mockResolvedValue({});
    const mockCreate = vi.fn().mockResolvedValue({
      data: {
        createWarehouse: {
          ok: true,
          warehouse: {
            id: "wh-new",
            plantId: "p1",
            plantName: "Plant Alpha",
            code: "WH-NEW",
            name: "New Warehouse",
            warehouseType: "RM",
            location: "Building Z",
            isActive: true,
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
          errors: [],
        },
      },
    });

    mockUseQuery.mockReturnValue({ ...DEFAULT_QUERY_RETURN, refetch: mockRefetch });
    mockUseMutation
      .mockReturnValueOnce([mockCreate, { loading: false }])
      .mockReturnValueOnce([vi.fn(), { loading: false }])
      .mockReturnValueOnce([vi.fn(), { loading: false }]);

    renderPage();

    await waitFor(() => expect(screen.getByText("New")).toBeInTheDocument());
    await user.click(screen.getByText("New"));

    await user.type(screen.getByPlaceholderText("Name *"), "New Warehouse");
    await user.type(screen.getByPlaceholderText("Code *"), "WH-NEW");
    await user.selectOptions(screen.getByDisplayValue("Select Plant *"), "p1");
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it("selects a warehouse and shows the detail panel", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("WH-MAIN")).toBeInTheDocument());
    await user.click(screen.getByText("WH-MAIN"));

    await waitFor(() => {
      expect(screen.getByText(/Main Warehouse/i)).toBeInTheDocument();
    });
  });

  it("opens edit form with pre-filled data for selected warehouse", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("WH-MAIN")).toBeInTheDocument());
    await user.click(screen.getByText("WH-MAIN"));

    await waitFor(() => expect(screen.getByText("Edit")).toBeInTheDocument());
    await user.click(screen.getByText("Edit"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Name *")).toHaveValue("Main Warehouse");
      expect(screen.getByPlaceholderText("Code *")).toHaveValue("WH-MAIN");
    });
  });

  it("updates a warehouse successfully", async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn().mockResolvedValue({});
    const mockUpdate = vi.fn().mockResolvedValue({
      data: {
        updateWarehouse: {
          ok: true,
          warehouse: {
            id: "wh1",
            plantId: "p1",
            plantName: "Plant Alpha",
            code: "WH-MAIN",
            name: "Main Warehouse Updated",
            warehouseType: "RM",
            location: "Building A - Zone 2",
            isActive: true,
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
          errors: [],
        },
      },
    });

    mockUseQuery.mockReturnValue({ ...DEFAULT_QUERY_RETURN, refetch: mockRefetch });
    mockUseMutation
      .mockReturnValueOnce([vi.fn(), { loading: false }])
      .mockReturnValueOnce([mockUpdate, { loading: false }])
      .mockReturnValueOnce([vi.fn(), { loading: false }]);

    renderPage();

    await waitFor(() => expect(screen.getByText("WH-MAIN")).toBeInTheDocument());
    await user.click(screen.getByText("WH-MAIN"));

    await waitFor(() => expect(screen.getByText("Edit")).toBeInTheDocument());
    await user.click(screen.getByText("Edit"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Name *")).toHaveValue("Main Warehouse");
    });
    await user.clear(screen.getByPlaceholderText("Name *"));
    await user.type(screen.getByPlaceholderText("Name *"), "Main Warehouse Updated");
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it("archives a warehouse with confirmation", async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn().mockResolvedValue({});
    const mockArchive = vi.fn().mockResolvedValue({
      data: {
        archiveWarehouse: {
          ok: true,
          warehouse: {
            id: "wh3",
            plantId: "p2",
            plantName: "Plant Beta",
            code: "WH-SCRAP",
            name: "Scrap Yard",
            warehouseType: "SCRAP",
            location: "Yard C",
            isActive: false,
            createdAt: "2024-01-20T10:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
          errors: [],
        },
      },
    });

    mockUseQuery.mockReturnValue({ ...DEFAULT_QUERY_RETURN, refetch: mockRefetch });
    mockUseMutation
      .mockReturnValueOnce([vi.fn(), { loading: false }])
      .mockReturnValueOnce([vi.fn(), { loading: false }])
      .mockReturnValueOnce([mockArchive, { loading: false }]);

    renderPage();

    await waitFor(() => expect(screen.getByText("WH-SCRAP")).toBeInTheDocument());
    await user.click(screen.getByText("WH-SCRAP"));

    await waitFor(() => expect(screen.getByText("Archive")).toBeInTheDocument());
    await user.click(screen.getByText("Archive"));

    await waitFor(() => {
      expect(screen.getByText("Archive warehouse?")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(mockArchive).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { id: "wh3" } }),
      );
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it("filters warehouses by plant", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/4 warehouses/i)).toBeInTheDocument());

    const plantFilter = screen.getByRole("combobox", { name: /plant/i });
    expect(plantFilter).toBeInTheDocument();

    await user.selectOptions(plantFilter, "p1");
    await waitFor(() => {
      expect(screen.getByText(/2 warehouse/i)).toBeInTheDocument();
    });
  });

  it("filters warehouses by status", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/4 warehouses/i)).toBeInTheDocument());

    const combos = screen.getAllByRole("combobox");
    const statusFilter = combos[combos.length - 1]!;
    expect(statusFilter).toBeInTheDocument();

    await user.selectOptions(statusFilter, "inactive");
    await waitFor(() => {
      expect(screen.getByText(/1 warehouse/i)).toBeInTheDocument();
    });
  });

  it("searches warehouses by code or name", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/4 warehouses/i)).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Search"), "SCRAP");

    await waitFor(() => {
      expect(screen.getByText(/1 warehouse/i)).toBeInTheDocument();
    });
  });

  it("shows mutation error when create fails", async () => {
    const user = userEvent.setup();
    const mockCreate = vi.fn().mockResolvedValue({
      data: {
        createWarehouse: {
          ok: false,
          warehouse: null,
          errors: [{ field: "code", code: "DUPLICATE", message: "Code already exists" }],
        },
      },
    });

    mockUseMutation
      .mockReturnValueOnce([mockCreate, { loading: false }])
      .mockReturnValueOnce([vi.fn(), { loading: false }])
      .mockReturnValueOnce([vi.fn(), { loading: false }]);

    renderPage();

    await waitFor(() => expect(screen.getByText("New")).toBeInTheDocument());
    await user.click(screen.getByText("New"));

    await user.type(screen.getByPlaceholderText("Name *"), "Duplicate");
    await user.type(screen.getByPlaceholderText("Code *"), "WH-EXIST");
    await user.selectOptions(screen.getByDisplayValue("Select Plant *"), "p1");
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText(/Code already exists/i)).toBeInTheDocument();
    });
  });

  it("cancels form mode and returns to view mode", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("New")).toBeInTheDocument());
    await user.click(screen.getByText("New"));

    expect(screen.getByPlaceholderText("Name *")).toBeInTheDocument();
    await user.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.getByText("New")).toBeInTheDocument();
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });
  });

  it("shows zero results when no warehouses match filters", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/4 warehouses/i)).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Search"), "ZZZZNONEXISTENT");

    await waitFor(() => {
      expect(screen.getByText(/0 warehouses/i)).toBeInTheDocument();
    });
  });
});

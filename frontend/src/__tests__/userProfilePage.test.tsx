import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing/react";
import { MemoryRouter } from "react-router-dom";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { DEPARTMENTS_QUERY } from "@/graphql/manufacturingQueries";
import { ROLES_QUERY, USER_PROFILES_QUERY, USER_ROLES_QUERY } from "@/graphql/administrationQueries";
import { PROFILE_SKILLS_QUERY } from "@/graphql/profileQueries";
import { UserProfilePage } from "@/pages/system/UserProfilePage";
import type { Profile } from "@/types/profile";

/* ── Polyfill IntersectionObserver for JSDOM ──────────────────────── */

if (typeof globalThis.IntersectionObserver === "undefined") {
  class MockIntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "0px";
    readonly thresholds: ReadonlyArray<number> = [0];
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  (globalThis as any).IntersectionObserver = MockIntersectionObserver;
}

/* ── Mock useProfile hook ──────────────────────────────────────────── */

const mockSaveProfile = vi.fn();
const mockRefetch = vi.fn();

// Use `var` for module-scoped mock state so vi.mock factory closure captures references correctly
var mockProfile: Profile | null = null; // eslint-disable-line no-var
var mockLoading = false; // eslint-disable-line no-var
var mockError: Error | null = null; // eslint-disable-line no-var
var mockSaving = false; // eslint-disable-line no-var

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    get profile() { return mockProfile; },
    get loading() { return mockLoading; },
    get error() { return mockError; },
    get saving() { return mockSaving; },
    saveProfile: mockSaveProfile,
    refetch: mockRefetch,
  }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/* ── Test data ──────────────────────────────────────────────────────── */

function createMockProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: "prof-1",
    user: "user-1",
    name: "Jane Doe",
    role: "Manufacturing Engineer",
    email: "jane.doe@company.com",
    phone: "+1 (555) 123-4567",
    location: "Detroit, MI",
    plant: "Plant A",
    department: "Engineering",
    reportsTo: "John Smith",
    language: "English, Romanian",
    about: "Experienced manufacturing engineer with expertise in lean manufacturing and continuous improvement.",
    createdAt: "2023-06-01T00:00:00Z",
    updatedAt: "2025-03-15T00:00:00Z",
    workHistory: [
      { id: "wh-1", role: "Senior Engineer", company: "AutoParts Inc.", period: "2022 - Present", description: "Led process improvement initiatives." },
      { id: "wh-2", role: "Junior Engineer", company: "MfgCo", period: "2019 - 2022", description: "Supported production line optimization." },
    ],
    education: [
      { id: "edu-1", degree: "M.Sc. Industrial Engineering", school: "MIT", period: "2015 - 2017" },
    ],
    ...overrides,
  };
}

/* ── Apollo mocks ──────────────────────────────────────────────────── */

function buildMocks() {
  return [
    {
      request: { query: PLANTS_QUERY },
      result: {
        data: {
          plants: [
            { id: "plant-1", name: "Plant A" },
            { id: "plant-2", name: "Plant B" },
          ],
        },
      },
    },
    {
      request: { query: DEPARTMENTS_QUERY },
      result: {
        data: {
          departments: [
            { id: "dept-1", name: "Engineering" },
            { id: "dept-2", name: "Production" },
            { id: "dept-3", name: "Quality" },
          ],
        },
      },
    },
    {
      request: { query: ROLES_QUERY, variables: { isActive: true } },
      result: {
        data: {
          roles: [
            { id: "role-1", code: "ENG", name: "Manufacturing Engineer" },
            { id: "role-2", code: "MGR", name: "Production Manager" },
          ],
        },
      },
    },
    {
      request: { query: USER_PROFILES_QUERY, variables: { userId: "user-1", isActive: true } },
      result: {
        data: {
          userProfiles: [{ id: "admin-prof-1" }],
        },
      },
    },
    // First USER_ROLES_QUERY fires with "auto" fallback before USER_PROFILES resolves
    {
      request: { query: USER_ROLES_QUERY, variables: { userProfileId: "auto" } },
      result: { data: { userRoles: [] } },
    },
    {
      request: { query: USER_ROLES_QUERY, variables: { userProfileId: "admin-prof-1" } },
      result: {
        data: {
          userRoles: [
            {
              id: "ur-1",
              userProfileId: "admin-prof-1",
              username: "jane.doe",
              fullName: "Jane Doe",
              roleId: "role-1",
              roleCode: "ENG",
              roleName: "Manufacturing Engineer",
              accessLevel: "Standard",
              companyId: "comp-1",
              companyName: "Company",
              plantId: "plant-1",
              plantName: "Plant A",
              administrativeDepartmentId: "dept-1",
              administrativeDepartmentName: "Engineering",
              isActive: true,
              assignedAt: "2024-01-01T00:00:00Z",
            },
          ],
        },
      },
    },
    // First PROFILE_SKILLS_QUERY fires with "auto" fallback before USER_PROFILES resolves
    {
      request: { query: PROFILE_SKILLS_QUERY, variables: { userProfileId: "auto" } },
      result: { data: { profileSkills: [] } },
    },
    {
      request: { query: PROFILE_SKILLS_QUERY, variables: { userProfileId: "admin-prof-1" } },
      result: {
        data: {
          profileSkills: [
            {
              __typename: "ProfileSkill",
              id: "skill-1",
              userProfileId: "admin-prof-1",
              name: "Lean Six Sigma",
              category: "CERTIFICATION",
              level: "Black Belt",
              issuer: "ASQ",
              issuedDate: "2024-06-15",
              expiresDate: null,
              evaluationScore: 9.2,
              isCertification: true,
              notes: "Six Sigma Black Belt certification",
              isActive: true,
              createdAt: "2024-01-01T00:00:00Z",
              updatedAt: "2024-06-15T00:00:00Z",
            },
          ],
        },
      },
    },
  ];
}

/* ── Render helper ──────────────────────────────────────────────────── */

function renderPage() {
  return render(
    <MockedProvider mocks={buildMocks()}>
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    </MockedProvider>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Integration tests — UserProfilePage with all 3 columns
   ═══════════════════════════════════════════════════════════════════ */

describe("UserProfilePage — integration", () => {
  beforeEach(() => {
    mockProfile = createMockProfile();
    mockLoading = false;
    mockError = null;
    mockSaving = false;
    mockSaveProfile.mockReset();
    mockSaveProfile.mockResolvedValue({ ok: true });
    mockNavigate.mockReset();
  });

  /* ── Loading state ── */

  describe("loading state", () => {
    it("renders loading spinner when profile is loading", () => {
      mockLoading = true;
      const { container } = renderPage();
      expect(container.textContent).toContain("Loading profile");
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("does not render column content during loading", () => {
      mockLoading = true;
      const { container } = renderPage();
      expect(container.textContent).not.toContain("Personal information");
      expect(container.textContent).not.toContain("Work history");
      expect(container.textContent).not.toContain("Education");
    });
  });

  /* ── Error state ── */

  describe("error state", () => {
    it("renders error message when profile query fails", () => {
      mockProfile = null;
      mockError = new Error("Failed to fetch profile");
      const { container } = renderPage();
      expect(container.textContent).toContain("Couldn't load profile");
    });

    it("renders retry button in error state", () => {
      mockProfile = null;
      mockError = new Error("Failed to fetch profile");
      renderPage();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  /* ── Full page rendering — all 3 columns ── */

  describe("full page rendering with all 3 columns", () => {
    it("renders the profile header with user name and role", async () => {
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("Jane Doe");
      });
      expect(container.textContent).toContain("Manufacturing Engineer");
    });

    it("renders Personal Information column with all section headers", async () => {
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("Personal information");
      });
      expect(container.textContent).toContain("Account & Access");
    });

    it("renders Work History column with section header and entries", async () => {
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("Work history");
      });
      expect(container.textContent).toContain("Senior Engineer");
      expect(container.textContent).toContain("AutoParts Inc.");
      expect(container.textContent).toContain("Junior Engineer");
      expect(container.textContent).toContain("MfgCo");
    });

    it("renders Education column with section header and entries", async () => {
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("Education");
      });
      expect(container.textContent).toContain("M.Sc. Industrial Engineering");
      expect(container.textContent).toContain("MIT");
    });

    it("renders skills section with data within Education column", async () => {
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("Lean Six Sigma");
      });
      expect(container.textContent).toContain("Skills & Certifications");
    });

    it("renders all three section header icons", async () => {
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("Personal information");
      });
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });

    it("renders footer with completion score", async () => {
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("Completion");
      });
      const footerEls = container.querySelectorAll("footer");
      const hasPercentage = Array.from(footerEls).some((el) => /\d+%/.test(el.textContent || ""));
      expect(hasPercentage).toBe(true);
    });

    it("renders 'From' and 'Updated' dates in footer", async () => {
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("From");
      });
      expect(container.textContent).toContain("Updated");
    });
  });

  /* ── Edit mode buttons ── */

  describe("edit mode buttons", () => {
    it("renders three edit section buttons in toolbar when not editing", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Personal Info")).toBeInTheDocument();
        expect(screen.getByText("Work History")).toBeInTheDocument();
      });
      // Multiple elements contain "Education" (button + column header), use getAllByText
      const eduButtons = screen.getAllByText("Education");
      expect(eduButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("renders Close button in toolbar when not editing", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Close")).toBeInTheDocument();
      });
    });

    it("clicks Personal Info edit button and shows Save/Cancel", async () => {
      renderPage();
      await waitFor(() => {
        fireEvent.click(screen.getByText("Personal Info"));
      });
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("shows editing indicator with section name when editing", async () => {
      renderPage();
      await waitFor(() => {
        fireEvent.click(screen.getByText("Personal Info"));
      });
      expect(screen.getByText("Personal Information")).toBeInTheDocument();
    });

    it("shows error count when field errors exist during save", async () => {
      mockSaveProfile.mockResolvedValue({
        ok: false,
        errors: { firstName: "First name is required." },
      });
      renderPage();
      await waitFor(() => {
        fireEvent.click(screen.getByText("Personal Info"));
      });
      const saveBtn = screen.getByText("Save");
      fireEvent.click(saveBtn);
      await waitFor(() => {
        expect(screen.getByText(/1 error/)).toBeInTheDocument();
      });
    });
  });

  /* ── Save success ── */

  describe("save success", () => {
    it("shows success toast after successful save", async () => {
      mockSaveProfile.mockResolvedValue({ ok: true });
      renderPage();
      await waitFor(() => {
        fireEvent.click(screen.getByText("Personal Info"));
      });
      fireEvent.click(screen.getByText("Save"));
      await waitFor(() => {
        expect(screen.getByText("Profile saved")).toBeInTheDocument();
      });
    });

    it("returns to view mode after successful save", async () => {
      mockSaveProfile.mockResolvedValue({ ok: true });
      renderPage();
      await waitFor(() => {
        fireEvent.click(screen.getByText("Personal Info"));
      });
      expect(screen.getByText("Save")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Save"));
      await waitFor(() => {
        expect(screen.queryByText("Save")).not.toBeInTheDocument();
      });
    });
  });

  /* ── Cancel editing ── */

  describe("cancel editing", () => {
    it("returns to view mode when Cancel is clicked", async () => {
      renderPage();
      await waitFor(() => {
        fireEvent.click(screen.getByText("Personal Info"));
      });
      expect(screen.getByText("Save")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Cancel"));
      await waitFor(() => {
        expect(screen.queryByText("Save")).not.toBeInTheDocument();
      });
      expect(screen.getByText("Personal Info")).toBeInTheDocument();
    });
  });

  /* ── Completion score popover ── */

  describe("completion score popover", () => {
    it("shows popover when completion bar is clicked", async () => {
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("Completion");
      });
      const percentEl = screen.getByText(/\d+%/);
      fireEvent.click(percentEl);
      await waitFor(() => {
        expect(screen.getByText("Missing fields")).toBeInTheDocument();
      });
    });

    it("shows all fields complete message at 100%", async () => {
      mockProfile = createMockProfile({
        name: "John Smith",
        role: "Manager",
        email: "john@co.com",
        phone: "+1 (555) 111-2222",
        location: "NYC",
        plant: "Plant A",
        department: "Engineering",
        reportsTo: "Boss",
        language: "English",
        about: "Summary.",
        workHistory: [
          { id: "wh-ok", role: "Engineer", company: "Company", period: "2020", description: "Desc" },
        ],
        education: [
          { id: "edu-ok", degree: "B.S.", school: "University", period: "2015" },
        ],
      });
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("Completion");
      });
      const percentEl = screen.getByText(/\d+%/);
      fireEvent.click(percentEl);
      await waitFor(() => {
        expect(screen.getByText(/All fields complete/i)).toBeInTheDocument();
      });
    });
  });

  /* ── Edge cases ── */

  describe("edge cases", () => {
    it("renders with empty profile (just created user)", async () => {
      mockProfile = createMockProfile({
        name: "",
        role: "",
        email: "",
        phone: "",
        location: "",
        plant: "",
        department: "",
        language: "",
        about: "",
        workHistory: [],
        education: [],
      });
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("Complete your profile");
      });
      expect(container.textContent).toContain("Add your position and details");
    });

    it("renders with missing optional work history fields", async () => {
      mockProfile = createMockProfile({
        workHistory: [
          { id: "wh-min", role: "Role Only", company: "", period: "", description: "" },
        ],
      });
      const { container } = renderPage();
      await waitFor(() => {
        expect(container.textContent).toContain("Work history");
      });
      expect(container.textContent).toContain("Role Only");
    });

    it("renders without crashing when user has no linked admin profile", async () => {
      mockProfile = createMockProfile({ user: "" });
      const mocks = [
        {
          request: { query: PLANTS_QUERY },
          result: { data: { plants: [{ id: "plant-1", name: "Plant A" }] } },
        },
        {
          request: { query: DEPARTMENTS_QUERY },
          result: { data: { departments: [{ id: "dept-1", name: "Engineering" }] } },
        },
        {
          request: { query: ROLES_QUERY, variables: { isActive: true } },
          result: { data: { roles: [{ id: "role-1", code: "ENG", name: "Manufacturing Engineer" }] } },
        },
        // USER_PROFILES_QUERY is skipped because profileUserId is empty
        {
          request: { query: USER_ROLES_QUERY, variables: { userProfileId: "auto" } },
          result: { data: { userRoles: [] } },
        },
        // AccountAccessBlock still fires USER_ROLES_QUERY with "auto" fallback
      ];
      render(
        <MockedProvider mocks={mocks}>
          <MemoryRouter>
            <UserProfilePage />
          </MemoryRouter>
        </MockedProvider>
      );
      await waitFor(() => {
        const headers = document.querySelectorAll("h2");
        const personalInfoHeader = Array.from(headers).find(
          (h) => h.textContent?.includes("Personal information")
        );
        expect(personalInfoHeader).toBeInTheDocument();
      });
      expect(document.body.textContent).toContain("Profile not linked");
    });
  });
});

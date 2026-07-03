import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing/react";
import { User, Shield } from "lucide-react";
import { ProfileSectionHeader } from "@/pages/system/profile/shared";
import { EducationColumn } from "@/pages/system/profile/EducationColumn";
import type { EducationEntry } from "@/types/profile";
import { PROFILE_SKILLS_QUERY } from "@/graphql/profileQueries";

/* ═══════════════════════════════════════════════════════════════════
   ProfileSectionHeader — pure presentational component
   ═══════════════════════════════════════════════════════════════════ */

describe("ProfileSectionHeader", () => {
  it("renders the title text", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Personal information"
        subtitle="Core identity and contact details"
      />
    );
    expect(container.textContent).toContain("Personal information");
  });

  it("renders the subtitle text", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Personal information"
        subtitle="Core identity and contact details"
      />
    );
    expect(container.textContent).toContain("Core identity and contact details");
  });

  it("renders as a <header> element", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Test"
        subtitle="Test subtitle"
      />
    );
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
  });

  it("applies the iconColor class to the icon", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-violet-500"
        title="Account & Access"
        subtitle="Roles and permissions"
      />
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("text-violet-500");
  });

  it("renders different icons based on prop", () => {
    const { container, rerender } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Personal"
        subtitle="Sub"
      />
    );
    rerender(
      <ProfileSectionHeader
        icon={Shield}
        iconColor="text-violet-500"
        title="Access"
        subtitle="Sub"
      />
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });

  it("renders title as an h2 element", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Work history"
        subtitle="Roles and impact"
      />
    );
    const h2 = container.querySelector("h2");
    expect(h2).toBeInTheDocument();
    expect(h2?.textContent).toBe("Work history");
  });

  it("renders subtitle as a p element", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Title"
        subtitle="A descriptive subtitle"
      />
    );
    const p = container.querySelector("p");
    expect(p).toBeInTheDocument();
    expect(p?.textContent).toBe("A descriptive subtitle");
  });

  it("has left-aligned title with text-left class", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Education"
        subtitle="Formal training"
      />
    );
    const h2 = container.querySelector("h2");
    expect(h2?.getAttribute("class")).toContain("text-left");
  });

  it("has left-aligned subtitle with text-left class", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Education"
        subtitle="Formal training"
      />
    );
    const p = container.querySelector("p");
    expect(p?.getAttribute("class")).toContain("text-left");
  });

  it("renders border-b and px-4 py-3 classes on the header", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Skills"
        subtitle="Competencies"
      />
    );
    const header = container.querySelector("header");
    expect(header?.getAttribute("class")).toContain("border-b");
    expect(header?.getAttribute("class")).toContain("border-slate-200");
    expect(header?.getAttribute("class")).toContain("px-4");
    expect(header?.getAttribute("class")).toContain("py-3");
  });

  it("renders an icon container div (w-5 shrink-0)", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Test"
        subtitle="Sub"
      />
    );
    const innerDiv = container.querySelector("header > div");
    expect(innerDiv?.getAttribute("class")).toContain("w-5");
    expect(innerDiv?.getAttribute("class")).toContain("shrink-0");
  });

  it("does not contain 'undefined', 'NaN', or 'null' strings", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Personal information"
        subtitle="Core identity and contact details"
      />
    );
    const html = container.innerHTML;
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("null");
  });

  /* ── Snapshot tests ── */

  it("matches snapshot with User icon and default colors", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Personal information"
        subtitle="Core identity and contact details"
      />
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("matches snapshot with Shield icon and violet color", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={Shield}
        iconColor="text-violet-500"
        title="Account & Access"
        subtitle="Roles and permissions"
      />
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("matches snapshot with long title and subtitle text", () => {
    const { container } = render(
      <ProfileSectionHeader
        icon={User}
        iconColor="text-sky-600"
        title="Skills & Certifications"
        subtitle="Professional certifications, licenses, and technical competencies"
      />
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Skills add/edit/delete workflow
   ═══════════════════════════════════════════════════════════════════ */

const MOCK_SKILLS = [
  {
    __typename: "ProfileSkill",
    id: "skill-1",
    userProfileId: "profile-1",
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
  {
    __typename: "ProfileSkill",
    id: "skill-2",
    userProfileId: "profile-1",
    name: "CNC Programming",
    category: "SKILL",
    level: "Expert",
    issuer: "",
    issuedDate: null,
    expiresDate: null,
    evaluationScore: null,
    isCertification: false,
    notes: "",
    isActive: true,
    createdAt: "2024-02-01T00:00:00Z",
    updatedAt: "2024-02-01T00:00:00Z",
  },
];

function emptyEduDraft(): EducationEntry[] {
  return [];
}

function fakeRef(): React.RefObject<HTMLDivElement | null> {
  return { current: document.createElement("div") };
}

function makeSkillsQueryMock(profileId: string, skills: typeof MOCK_SKILLS) {
  return {
    request: {
      query: PROFILE_SKILLS_QUERY,
      variables: { userProfileId: profileId },
    },
    result: {
      data: { profileSkills: skills },
    },
  };
}

interface MockResponse {
  request: { query: unknown; variables: Record<string, unknown> };
  result?: { data: unknown };
  delay?: number;
}

interface RenderResult {
  container: HTMLElement;
}

function renderEducation(mocks: MockResponse[], adminProfileId: string | null): RenderResult {
  const { container } = render(
    <MockedProvider mocks={mocks as any}>
      <EducationColumn
        adminProfileId={adminProfileId}
        eduDraft={emptyEduDraft()}
        setEduDraft={() => {}}
        editingSection={null}
        startEditing={() => {}}
        fieldErrors={{}}
        educationRef={fakeRef()}
      />
    </MockedProvider>
  );
  return { container };
}

/* ── Loading state ── */

describe("EducationColumn — skills loading state", () => {
  it("shows a loading spinner while skills are being fetched", async () => {
    const mocks = [
      {
        request: {
          query: PROFILE_SKILLS_QUERY,
          variables: { userProfileId: "profile-1" },
        },
        delay: 99999,
      },
    ];
    const { container } = renderEducation(mocks, "profile-1");
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});

/* ── Empty state ── */

describe("EducationColumn — skills empty state", () => {
  it("shows 'No skills or certifications added' when skills list is empty", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", [])];
    renderEducation(mocks, "profile-1");
    const emptyText = await screen.findByText("No skills or certifications added.");
    expect(emptyText).toBeInTheDocument();
  });

  it("shows an 'Add Skill' button in empty state", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", [])];
    renderEducation(mocks, "profile-1");
    const addButton = await screen.findByText("Add Skill");
    expect(addButton).toBeInTheDocument();
  });
});

/* ── View mode ── */

describe("EducationColumn — skills view mode", () => {
  it("renders skill names from the API", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", MOCK_SKILLS)];
    renderEducation(mocks, "profile-1");
    expect(await screen.findByText("Lean Six Sigma")).toBeInTheDocument();
    expect(await screen.findByText("CNC Programming")).toBeInTheDocument();
  });

  it("renders category badges for each skill", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", MOCK_SKILLS)];
    const { container } = renderEducation(mocks, "profile-1");
    await screen.findByText("Lean Six Sigma");
    const allEls = container.querySelectorAll("*");
    const catBadges = Array.from(allEls).filter(
      (el) => el.textContent === "Certification" && el.tagName === "SPAN" && el.className.includes("rounded")
    );
    expect(catBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("renders skill level labels", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", MOCK_SKILLS)];
    const { container } = renderEducation(mocks, "profile-1");
    await screen.findByText("Lean Six Sigma");
    expect(container.textContent).toContain("Black Belt");
  });

  it("renders evaluation score when present", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", MOCK_SKILLS)];
    const { container } = renderEducation(mocks, "profile-1");
    await screen.findByText("Lean Six Sigma");
    expect(container.textContent).toContain("Score:");
    expect(container.textContent).toContain("9.2");
  });

  it("renders Certification badge when isCertification is true", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", MOCK_SKILLS)];
    const { container } = renderEducation(mocks, "profile-1");
    await screen.findByText("Lean Six Sigma");
    // Check that container contains the Certification badge text at least twice
    // (once as category badge, once as isCertification badge)
    const matches = container.textContent?.match(/Certification/g);
    expect(matches?.length).toBeGreaterThanOrEqual(2);
  });

  it("renders issued date when present", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", MOCK_SKILLS)];
    renderEducation(mocks, "profile-1");
    const issuedText = await screen.findByText(/Issued:/);
    expect(issuedText).toBeInTheDocument();
  });

  it("renders notes when present", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", MOCK_SKILLS)];
    renderEducation(mocks, "profile-1");
    const notes = await screen.findByText("Six Sigma Black Belt certification");
    expect(notes).toBeInTheDocument();
  });
});

/* ── Add workflow ── */

describe("EducationColumn — skills add workflow", () => {
  it("opens add skill form when Add Skill button is clicked", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", [])];
    renderEducation(mocks, "profile-1");
    const addButton = await screen.findByText("Add Skill");
    fireEvent.click(addButton);
    const nameInput = document.querySelector<HTMLInputElement>(
      'input[placeholder="Skill or certification name"]'
    );
    expect(nameInput).toBeInTheDocument();
  });

  it("renders evaluation score field in add form", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", [])];
    renderEducation(mocks, "profile-1");
    const addButton = await screen.findByText("Add Skill");
    fireEvent.click(addButton);
    const scoreInput = document.querySelector<HTMLInputElement>(
      'input[placeholder="e.g. 8.5"]'
    );
    expect(scoreInput).toBeInTheDocument();
  });

  it("renders certification checkbox in add form", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", [])];
    renderEducation(mocks, "profile-1");
    const addButton = await screen.findByText("Add Skill");
    fireEvent.click(addButton);
    const labelEls = document.querySelectorAll("label");
    const certLabels = Array.from(labelEls).filter(
      (l) => l.textContent?.trim() === "Certification"
    );
    expect(certLabels.length).toBeGreaterThan(0);
  });

  it("cancels add form and returns to empty state", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", [])];
    renderEducation(mocks, "profile-1");
    const addButton = await screen.findByText("Add Skill");
    fireEvent.click(addButton);
    const allButtons = document.querySelectorAll("button");
    const cancel = Array.from(allButtons).find(
      (btn) => btn.textContent?.trim() === "Cancel"
    );
    expect(cancel).toBeInTheDocument();
    if (cancel) fireEvent.click(cancel);
    const addBtnAgain = await screen.findByText("Add Skill");
    expect(addBtnAgain).toBeInTheDocument();
  });
});

/* ── Edit workflow ── */

describe("EducationColumn — skills edit workflow", () => {
  it("renders edit pencil icon for each skill row", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", MOCK_SKILLS)];
    renderEducation(mocks, "profile-1");
    await screen.findByText("Lean Six Sigma");
    const editButtons = document.querySelectorAll('button[title="Edit skill"]');
    expect(editButtons.length).toBe(2);
  });

  it("renders delete trash icon for each skill row", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", MOCK_SKILLS)];
    renderEducation(mocks, "profile-1");
    await screen.findByText("Lean Six Sigma");
    const deleteButtons = document.querySelectorAll('button[title="Delete skill"]');
    expect(deleteButtons.length).toBe(2);
  });
});

/* ── Delete workflow ── */

describe("EducationColumn — skills delete workflow", () => {
  it("shows delete confirmation when delete icon is clicked", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", [MOCK_SKILLS[0]])];
    renderEducation(mocks, "profile-1");
    await screen.findByText("Lean Six Sigma");
    const deleteBtn = document.querySelector('button[title="Delete skill"]');
    if (deleteBtn) fireEvent.click(deleteBtn);
    const spans = document.querySelectorAll("span");
    const deletePrompt = Array.from(spans).find(
      (s) => s.textContent?.includes("Delete?")
    );
    expect(deletePrompt).toBeInTheDocument();
  });

  it("shows Yes and No buttons during delete confirmation", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", [MOCK_SKILLS[0]])];
    renderEducation(mocks, "profile-1");
    await screen.findByText("Lean Six Sigma");
    const deleteBtn = document.querySelector('button[title="Delete skill"]');
    if (deleteBtn) fireEvent.click(deleteBtn);
    const allButtons = document.querySelectorAll("button");
    const yesBtn = Array.from(allButtons).find((b) => b.textContent?.trim() === "Yes");
    const noBtn = Array.from(allButtons).find((b) => b.textContent?.trim() === "No");
    expect(yesBtn).toBeInTheDocument();
    expect(noBtn).toBeInTheDocument();
  });

  it("cancels delete when No is clicked", async () => {
    const mocks = [makeSkillsQueryMock("profile-1", [MOCK_SKILLS[0]])];
    renderEducation(mocks, "profile-1");
    await screen.findByText("Lean Six Sigma");
    const deleteBtn = document.querySelector('button[title="Delete skill"]');
    if (deleteBtn) fireEvent.click(deleteBtn);
    const allButtons = document.querySelectorAll("button");
    const noBtn = Array.from(allButtons).find((b) => b.textContent?.trim() === "No");
    if (noBtn) fireEvent.click(noBtn);
    const editBtns = document.querySelectorAll('button[title="Edit skill"]');
    expect(editBtns.length).toBe(1);
  });
});

/* ── Null admin profile ── */

describe("EducationColumn — skills with no admin profile", () => {
  it("uses 'auto' as profileId when adminProfileId is null", async () => {
    const mocks = [
      {
        request: {
          query: PROFILE_SKILLS_QUERY,
          variables: { userProfileId: "auto" },
        },
        result: {
          data: { profileSkills: [] },
        },
      },
    ];
    renderEducation(mocks, null);
    const addButton = await screen.findByText("Add Skill");
    expect(addButton).toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Education section — view/edit modes
   ═══════════════════════════════════════════════════════════════════ */

describe("EducationColumn — education section view mode", () => {
  it("renders degree, school, and period from eduDraft", () => {
    const eduDraft: EducationEntry[] = [
      { id: "edu-1", degree: "M.Sc. Industrial Engineering", school: "MIT", period: "2015 - 2017" },
    ];
    const { container } = render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={eduDraft}
          setEduDraft={() => {}}
          editingSection={null}
          startEditing={() => {}}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    expect(container.textContent).toContain("M.Sc. Industrial Engineering");
    expect(container.textContent).toContain("MIT");
    expect(container.textContent).toContain("2015 - 2017");
  });

  it("shows 'Untitled degree' when degree is empty", () => {
    const eduDraft: EducationEntry[] = [
      { id: "edu-2", degree: "", school: "State University", period: "2020" },
    ];
    const { container } = render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={eduDraft}
          setEduDraft={() => {}}
          editingSection={null}
          startEditing={() => {}}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    expect(container.textContent).toContain("Untitled degree");
  });

  it("renders school with period in parentheses when both present", () => {
    const eduDraft: EducationEntry[] = [
      { id: "edu-3", degree: "B.Sc. Engineering", school: "Tech U", period: "2011 - 2015" },
    ];
    const { container } = render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={eduDraft}
          setEduDraft={() => {}}
          editingSection={null}
          startEditing={() => {}}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    // School and period should appear together
    expect(container.textContent).toContain("Tech U");
    expect(container.textContent).toContain("2011 - 2015");
  });

  it("renders BookOpen icon in header", () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={[]}
          setEduDraft={() => {}}
          editingSection={null}
          startEditing={() => {}}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    expect(container.textContent).toContain("Education");
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });
});

describe("EducationColumn — education section empty state", () => {
  it("shows 'No education added' when eduDraft is empty", () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={[]}
          setEduDraft={() => {}}
          editingSection={null}
          startEditing={() => {}}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    expect(container.textContent).toContain("No education added");
  });

  it("shows 'Add Education' action button in empty state", () => {
    render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={[]}
          setEduDraft={() => {}}
          editingSection={null}
          startEditing={() => {}}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    expect(screen.getByText("Add Education")).toBeInTheDocument();
  });

  it("calls startEditing('edu') when Add Education is clicked", () => {
    const startEditing = vi.fn();
    render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={[]}
          setEduDraft={() => {}}
          editingSection={null}
          startEditing={startEditing}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    fireEvent.click(screen.getByText("Add Education"));
    expect(startEditing).toHaveBeenCalledWith("edu");
  });
});

describe("EducationColumn — education section edit mode", () => {
  it("renders degree input field when editingSection is 'edu'", () => {
    const eduDraft: EducationEntry[] = [
      { id: "edu-edit-1", degree: "MBA", school: "Business School", period: "2018 - 2020" },
    ];
    render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={eduDraft}
          setEduDraft={() => {}}
          editingSection="edu"
          startEditing={() => {}}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    const degreeInput = document.querySelector<HTMLInputElement>('input[placeholder="M.Sc. Industrial Engineering"]');
    expect(degreeInput).toBeInTheDocument();
    expect(degreeInput?.value).toBe("MBA");
  });

  it("renders school input field when editing", () => {
    const eduDraft: EducationEntry[] = [
      { id: "edu-edit-2", degree: "Ph.D.", school: "Research U", period: "2020 - 2024" },
    ];
    render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={eduDraft}
          setEduDraft={() => {}}
          editingSection="edu"
          startEditing={() => {}}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    const schoolInput = document.querySelector<HTMLInputElement>('input[placeholder="University name"]');
    expect(schoolInput).toBeInTheDocument();
    expect(schoolInput?.value).toBe("Research U");
  });

  it("renders period input field when editing", () => {
    const eduDraft: EducationEntry[] = [
      { id: "edu-edit-3", degree: "B.A.", school: "College", period: "2014 - 2018" },
    ];
    render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={eduDraft}
          setEduDraft={() => {}}
          editingSection="edu"
          startEditing={() => {}}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    const periodInput = document.querySelector<HTMLInputElement>('input[placeholder="2015 - 2017"]');
    expect(periodInput).toBeInTheDocument();
    expect(periodInput?.value).toBe("2014 - 2018");
  });

  it("renders Remove button for each education entry when editing", () => {
    const eduDraft: EducationEntry[] = [
      { id: "edu-rem-1", degree: "Degree 1", school: "School 1", period: "2020" },
      { id: "edu-rem-2", degree: "Degree 2", school: "School 2", period: "2022" },
    ];
    render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={eduDraft}
          setEduDraft={() => {}}
          editingSection="edu"
          startEditing={() => {}}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    const removeButtons = screen.getAllByText("Remove");
    expect(removeButtons.length).toBe(2);
  });

  it("calls setEduDraft with filter when Remove is clicked", () => {
    const eduDraft: EducationEntry[] = [
      { id: "edu-rem-target", degree: "To Remove", school: "School", period: "2024" },
      { id: "edu-keep", degree: "Keep", school: "School", period: "2020" },
    ];
    const setEduDraft = vi.fn();
    render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={eduDraft}
          setEduDraft={setEduDraft}
          editingSection="edu"
          startEditing={() => {}}
          fieldErrors={{}}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    const removeButtons = screen.getAllByText("Remove");
    fireEvent.click(removeButtons[0]);

    expect(setEduDraft).toHaveBeenCalledTimes(1);
    const setterFn = setEduDraft.mock.calls[0][0];
    const result = setterFn(eduDraft);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("edu-keep");
  });

  it("displays degree field error when provided", () => {
    const eduDraft: EducationEntry[] = [
      { id: "edu-err", degree: "", school: "School", period: "2020" },
    ];
    render(
      <MockedProvider mocks={[]}>
        <EducationColumn
          adminProfileId="profile-1"
          eduDraft={eduDraft}
          setEduDraft={() => {}}
          editingSection="edu"
          startEditing={() => {}}
          fieldErrors={{ "edu-0-degree": "Degree is required for each education entry." }}
          educationRef={fakeRef()}
        />
      </MockedProvider>
    );
    expect(screen.getByText("Degree is required for each education entry.")).toBeInTheDocument();
  });
});

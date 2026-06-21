import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing/react";
import { gql } from "@apollo/client";
import { SafetyEventsPage } from "@/pages/safety/SafetyEventsPage";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/productionLineQueries";
import { DEPARTMENTS_QUERY, RESOURCE_GROUPS_QUERY, RESOURCES_QUERY } from "@/graphql/manufacturingQueries";

// ── GraphQL document (must match inline doc in SafetyEventsPage) ──

const SAFETY_EVENTS_BY_TYPE = gql`
  query SafetyEventsByType($eventType: String, $status: String) {
    safetyEvents(eventType: $eventType, status: $status) {
      id eventType severity status targetType targetId title description
      reportedBy reportedAt occurredAt locationText immediateAction
      injuryInvolved propertyDamage environmentalImpact owner closedAt notes createdAt
    }
  }
`;

// ── Mocks ──

function createEntityMocks() {
  return [
    {
      request: { query: PLANTS_QUERY, variables: { status: "ACTIVE" } },
      result: { data: { plants: [] } },
    },
    {
      request: { query: PRODUCTION_LINES_QUERY, variables: { status: "ACTIVE", limit: 500 } },
      result: { data: { productionLines: [] } },
    },
    {
      request: { query: DEPARTMENTS_QUERY, variables: { status: "ACTIVE" } },
      result: { data: { departments: [] } },
    },
    {
      request: { query: RESOURCE_GROUPS_QUERY, variables: {} },
      result: { data: { resourceGroups: [] } },
    },
    {
      request: { query: RESOURCES_QUERY, variables: {} },
      result: { data: { resources: [] } },
    },
  ];
}

function createSafetyEventMock(eventTypeFilter: string) {
  return {
    request: {
      query: SAFETY_EVENTS_BY_TYPE,
      variables: { eventType: eventTypeFilter, status: null },
    },
    result: { data: { safetyEvents: [] } },
  };
}

function renderWithRoute(route: string) {
  const eventTypeFilter =
    route === "incidents"    ? "INCIDENT,ACCIDENT"
    : route === "near-misses" ? "NEAR_MISS"
    :                           "HAZARD,OBSERVATION";

  const mocks = [createSafetyEventMock(eventTypeFilter), ...createEntityMocks()];

  return render(
    <MemoryRouter initialEntries={[`/safety/${route}`]}>
      <MockedProvider mocks={mocks}>
        <SafetyEventsPage />
      </MockedProvider>
    </MemoryRouter>
  );
}

/** Click the first "New Event" button and wait for the form to appear. */
async function clickNewEvent() {
  const buttons = await screen.findAllByText("New Event");
  fireEvent.click(buttons[0]);
  // Wait for the form's section heading to appear
  await screen.findByText("Event Classification");
}

// ── Tests ──

describe("SafetyEventsPage — Route Awareness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Route: Incidents / Accidents ──

  describe("/safety/incidents", () => {
    it("shows Incidents / Accidents title and subtitle", async () => {
      renderWithRoute("incidents");
      // Title appears in both header and detail panel
      const titles = await screen.findAllByText("Incidents / Accidents");
      expect(titles.length).toBeGreaterThanOrEqual(2);
      expect(
        await screen.findByText(
          "Record and track safety incidents and accidents across the plant.",
        ),
      ).toBeDefined();
    });

    it("shows route-specific empty state", async () => {
      renderWithRoute("incidents");
      expect(
        await screen.findByText("No incidents or accidents reported."),
      ).toBeDefined();
    });

    it("shows event type select with Incident and Accident options", async () => {
      renderWithRoute("incidents");
      await clickNewEvent();

      // The event type select has "Incident" selected by default, so
      // getByDisplayValue finds it by the selected option's display text
      const eventTypeSelect = screen.getByDisplayValue("Incident") as HTMLSelectElement;
      expect(eventTypeSelect).toBeDefined();
      const optionValues = Array.from(eventTypeSelect.options).map((o) => o.value);
      expect(optionValues).toContain("INCIDENT");
      expect(optionValues).toContain("ACCIDENT");
      expect(optionValues).not.toContain("NEAR_MISS");
      expect(optionValues).not.toContain("HAZARD");
      expect(optionValues).not.toContain("OBSERVATION");
    });

    it("defaults event type to Incident", async () => {
      renderWithRoute("incidents");
      await clickNewEvent();
      const eventTypeSelect = screen.getByDisplayValue("Incident") as HTMLSelectElement;
      expect(eventTypeSelect.value).toBe("INCIDENT");
    });

    it("shows Incident / accident description label in form", async () => {
      renderWithRoute("incidents");
      await clickNewEvent();
      expect(screen.getByText("Incident / accident description *")).toBeDefined();
    });

    it("shows Immediate action taken label in form", async () => {
      renderWithRoute("incidents");
      await clickNewEvent();
      expect(screen.getByText("Immediate action taken", { exact: false })).toBeDefined();
    });
  });

  // ── Route: Near Misses ──

  describe("/safety/near-misses", () => {
    it("shows Near Misses title and subtitle", async () => {
      renderWithRoute("near-misses");
      const titles = await screen.findAllByText("Near Misses");
      expect(titles.length).toBeGreaterThanOrEqual(2);
      expect(
        await screen.findByText(
          "Log near-miss events to identify hazards before they cause harm.",
        ),
      ).toBeDefined();
    });

    it("shows route-specific empty state", async () => {
      renderWithRoute("near-misses");
      expect(
        await screen.findByText("No near misses reported."),
      ).toBeDefined();
    });

    it("hides event type dropdown and shows read-only Near Miss label", async () => {
      const { container } = renderWithRoute("near-misses");
      await clickNewEvent();

      // Read-only "Near Miss" label should be visible
      expect(screen.getByText("Event Type")).toBeDefined();
      expect(screen.getByText("Near Miss")).toBeDefined();
      // No select option should contain NEAR_MISS as a value
      const allOptions = container.querySelectorAll<HTMLOptionElement>("select option");
      const optionValues = Array.from(allOptions).map((o) => o.value);
      expect(optionValues).not.toContain("NEAR_MISS");
    });

    it("shows Potential impact / what almost happened label in form", async () => {
      renderWithRoute("near-misses");
      await clickNewEvent();
      expect(screen.getByText("Potential impact / what almost happened *")).toBeDefined();
    });

    it("shows Preventive action taken label in form", async () => {
      renderWithRoute("near-misses");
      await clickNewEvent();
      expect(screen.getByText("Preventive action taken", { exact: false })).toBeDefined();
    });
  });

  // ── Route: Hazards / Observations ──

  describe("/safety/hazards", () => {
    it("shows Hazards / Observations title and subtitle", async () => {
      renderWithRoute("hazards");
      const titles = await screen.findAllByText("Hazards / Observations");
      expect(titles.length).toBeGreaterThanOrEqual(2);
      expect(
        await screen.findByText(
          "Document hazards and general safety observations.",
        ),
      ).toBeDefined();
    });

    it("shows route-specific empty state", async () => {
      renderWithRoute("hazards");
      expect(
        await screen.findByText("No hazards or observations reported."),
      ).toBeDefined();
    });

    it("shows event type select with Hazard and Observation options, never Near Miss", async () => {
      renderWithRoute("hazards");
      await clickNewEvent();

      const eventTypeSelect = screen.getByDisplayValue("Hazard") as HTMLSelectElement;
      expect(eventTypeSelect).toBeDefined();
      const optionValues = Array.from(eventTypeSelect.options).map((o) => o.value);
      expect(optionValues).toContain("HAZARD");
      expect(optionValues).toContain("OBSERVATION");
      expect(optionValues).not.toContain("INCIDENT");
      expect(optionValues).not.toContain("ACCIDENT");
      expect(optionValues).not.toContain("NEAR_MISS");
    });

    it("defaults event type to Hazard", async () => {
      renderWithRoute("hazards");
      await clickNewEvent();
      const eventTypeSelect = screen.getByDisplayValue("Hazard") as HTMLSelectElement;
      expect(eventTypeSelect.value).toBe("HAZARD");
    });

    it("shows Hazard or observation description label in form", async () => {
      renderWithRoute("hazards");
      await clickNewEvent();
      expect(screen.getByText("Hazard or observation description *")).toBeDefined();
    });

    it("shows Suggested immediate control label in form", async () => {
      renderWithRoute("hazards");
      await clickNewEvent();
      expect(screen.getByText("Suggested immediate control", { exact: false })).toBeDefined();
    });
  });

  // ── Cross-route edge cases ──

  describe("Cross-route", () => {
    it("shows correct empty state for incidents route", async () => {
      renderWithRoute("incidents");
      expect(await screen.findByText("No incidents or accidents reported.")).toBeDefined();
    });

    it("shows correct empty state for near-misses route", async () => {
      renderWithRoute("near-misses");
      expect(await screen.findByText("No near misses reported.")).toBeDefined();
    });

    it("shows correct empty state for hazards route", async () => {
      renderWithRoute("hazards");
      expect(await screen.findByText("No hazards or observations reported.")).toBeDefined();
    });

    it("shows footer event count of 0 on incidents route", async () => {
      renderWithRoute("incidents");
      expect(await screen.findByText("0 events")).toBeDefined();
    });

    it("shows purpose text in detail panel for hazards route", async () => {
      renderWithRoute("hazards");
      expect(
        await screen.findByText(
          "Identify and document workplace hazards and safety observations. Track resolution from identification through close-out.",
        ),
      ).toBeDefined();
    });
  });
});

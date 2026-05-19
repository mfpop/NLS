import { lazy, Suspense, type LazyExoticComponent, type ReactElement } from "react";

const DepartmentsPage = lazy(() =>
  import("./DepartmentsPage").then((m) => ({ default: m.DepartmentsPage })),
);
const ProductionLinesPage = lazy(() =>
  import("./ProductionLinesPage").then((m) => ({ default: m.ProductionLinesPage })),
);
const ResourceGroupsPage = lazy(() =>
  import("./ResourceGroupsPage").then((m) => ({ default: m.ResourceGroupsPage })),
);
const ResourcesPage = lazy(() =>
  import("./ResourcesPage").then((m) => ({ default: m.ResourcesPage })),
);

export type FlowEmbeddedDetailKind = "department" | "line" | "rg" | "resource";

const PAGE_BY_KIND: Record<
  FlowEmbeddedDetailKind,
  LazyExoticComponent<(props: { embeddedInFlow?: boolean }) => ReactElement>
> = {
  department: DepartmentsPage,
  line: ProductionLinesPage,
  rg: ResourceGroupsPage,
  resource: ResourcesPage,
};

function DetailFallback() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Loading details...
    </div>
  );
}

export function FlowEmbeddedDetail({ kind }: { kind: FlowEmbeddedDetailKind }) {
  const Page = PAGE_BY_KIND[kind];
  return (
    <Suspense fallback={<DetailFallback />}>
      <Page embeddedInFlow />
    </Suspense>
  );
}

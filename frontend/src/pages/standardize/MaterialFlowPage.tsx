import { Package } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const sections = [
  { title: "FIFO Rules", desc: "First-in-first-out material flow standards for production lanes." },
  { title: "Supermarket Rules", desc: "Supermarket sizing, replenishment triggers, and pull signals." },
  { title: "Kanban Rules", desc: "Kanban card sizing, loop design, and signal management." },
  { title: "Bin Standards", desc: "Standard container types, quantities, and labeling." },
  { title: "RM/WIP/FG Flow", desc: "Raw material, WIP, and finished goods flow paths and rules." },
  { title: "Scrap Flow", desc: "Scrap material segregation, collection, and disposal procedures." },
  { title: "Quarantine Flow", desc: "Material hold, inspection, and release quarantine processes." },
];

export function MaterialFlowPage() {
  return (
    <AppPageLayout
      title="Material Flow"
      subtitle="Define material movement standards, pull systems, and inventory flow rules."
      icon={<Package />}
    >
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sections.map((s) => (
          <div key={s.title} className="rounded-xl border border-border/20 bg-card p-4 hover:border-border/40 transition-colors cursor-pointer">
            <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </AppPageLayout>
  );
}

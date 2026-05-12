import { useState, useEffect } from "react";

interface DiagramRendererProps {
  chart: string;
}

export function DiagramRenderer({ chart }: DiagramRendererProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;

        mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const renderResult = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(renderResult.svg);
          setHasError(false);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
          setSvg(null);
        }
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (hasError || !svg) {
    return <pre className="code-block">{chart}</pre>;
  }

  return <div className="mermaid-block" dangerouslySetInnerHTML={{ __html: svg }} />;
}

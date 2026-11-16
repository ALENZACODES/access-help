import { useLayoutEffect, useRef, useState } from "react";
import { formatScale, layoutPlot, separatePoints } from "./plot.js";
import { placesText } from "./strings.js";
import { statusLabel } from "./statusText.js";
import type { Language, PlaceRecord, Wheelchair } from "./types.js";

function Shape({ status }: { status: Wheelchair }) {
  // Shape, not colour, carries the status.
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" className={`shape shape-${status}`}>
      {status === "yes" ? <circle cx="12" cy="12" r="8" /> : null}
      {status === "limited" ? <polygon points="12,3 22,21 2,21" /> : null}
      {status === "no" ? <rect x="4" y="4" width="16" height="16" /> : null}
      {status === "UNKNOWN" ? <circle cx="12" cy="12" r="7" fill="none" /> : null}
    </svg>
  );
}

export interface PlotItem {
  record: PlaceRecord;
}

/**
 * Plain plot of places. Every point is a 44 pixel button. The list view is the
 * complete alternative, so nothing is available only here.
 */
export function PlacePlot({
  language,
  items,
  selectedId,
  onSelect,
}: {
  language: Language;
  items: readonly PlotItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const t = (key: Parameters<typeof placesText>[1], vars?: Record<string, string | number>) => placesText(language, key, vars);
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 400, button: 44 });

  // A point is a 2.75rem button. Measure the frame and the root text size, so buttons never overlap
  // at any window width or text size setting.
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setSize({ width: box.width || 640, height: box.height || 400, button: 2.75 * root });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [items.length]);

  if (items.length === 0) return <p>{t("plotNone")}</p>;
  const layout = layoutPlot(items.map(({ record }) => ({ id: record.id, lat: record.lat, lon: record.lon })));
  const spaced = separatePoints(
    layout.points.map((p) => ({ id: p.id, x: (p.xPct / 100) * size.width, y: (p.yPct / 100) * size.height })),
    size.width,
    size.height,
    size.button + 4,
  );
  const byId = new Map(spaced.points.map((point) => [point.id, point]));
  return (
    <div className="plot-wrap">
      <h3>{t("plotHeading")}</h3>
      <p className="hint">{t("plotHelp")}</p>
      {spaced.ok ? null : <p role="status">{t("plotTooMany")}</p>}
      <div className="plot" role="group" aria-label={t("plotLabel")} ref={frame} hidden={!spaced.ok}>
        {items.map(({ record }) => {
          const point = byId.get(record.id);
          if (!point) return null;
          const name = record.name ?? t("unnamed");
          return (
            <button
              key={record.id}
              type="button"
              className="plot-point"
              style={{ left: `${(point.x / size.width) * 100}%`, top: `${(point.y / size.height) * 100}%` }}
              aria-pressed={selectedId === record.id}
              aria-label={t("plotPoint", { name, status: statusLabel(record.wheelchair, language) })}
              onClick={() => onSelect(record.id)}
            >
              <Shape status={record.wheelchair} />
            </button>
          );
        })}
        <div className="plot-scale" aria-hidden="true">
          <span className="plot-scale-bar" style={{ width: `${layout.scaleWidthPct}%` }} />
          <span>{formatScale(layout.scaleKm, language)}</span>
        </div>
      </div>
      <p hidden={!spaced.ok}>
        {t("plotNorth")} {t("plotScale", { scale: formatScale(layout.scaleKm, language) })}
      </p>
      <p>{t("plotLegend")}</p>
    </div>
  );
}

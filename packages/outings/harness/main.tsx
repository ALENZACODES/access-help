import { createRoot } from "react-dom/client";
import { EventOutingPlanner, OutingsApp } from "../src/index";

const q = new URLSearchParams(location.search);
const lang = q.get("lang") === "fr" ? "fr" : "en";
document.documentElement.lang = lang;
createRoot(document.getElementById("root")!).render(
  q.get("view") === "event-plan" ? <EventOutingPlanner lang={lang} /> : <OutingsApp lang={lang} initialListId={q.get("list")} />,
);

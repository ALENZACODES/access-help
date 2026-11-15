import { createRoot } from "react-dom/client";
import { OutingsApp } from "../src/index";

const q = new URLSearchParams(location.search);
const lang = q.get("lang") === "fr" ? "fr" : "en";
document.documentElement.lang = lang;
createRoot(document.getElementById("root")!).render(
  <OutingsApp lang={lang} initialListId={q.get("list")} />,
);

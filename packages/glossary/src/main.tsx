import { createRoot } from "react-dom/client";
import { GlossaryBrowser } from "./Browser.js";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
createRoot(root).render(<GlossaryBrowser />);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("./sw.js");
}

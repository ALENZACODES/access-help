import { createRoot } from "react-dom/client";
import { PeerConnect } from "../src/ui/index.js";
import "../src/ui/peers.css";

const requested = new URLSearchParams(window.location.search).get("lang");
const language = requested === "fr" ? "fr" : "en";
document.documentElement.lang = language;

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<PeerConnect language={language} />);
}

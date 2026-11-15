import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

const initial = new URLSearchParams(window.location.search).get("lang");
document.documentElement.lang = initial === "fr" ? "fr" : "en";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

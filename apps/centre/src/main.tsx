import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { i18n } from "./i18n.js";
import { App } from "./App.js";
import { applyPrefs, loadPrefs, systemWantsMoreContrast } from "./settings/index.js";
import "./shell.css";
import "./settings/a11y-prefs.css";

// Apply display settings before the first paint, so a saved high contrast choice does not flash.
applyPrefs(loadPrefs(window.localStorage, systemWantsMoreContrast()), document.documentElement);

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nextProvider>
  </StrictMode>,
);

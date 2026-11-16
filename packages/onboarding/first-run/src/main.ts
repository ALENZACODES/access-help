import type { Violation } from "./audit";
import { registerOffline } from "./register";
import { mountShell } from "./shell";
import { safeLocalStorage } from "./store";

/** Browser entry. Mounts the shell and sets up offline use. */
const root = document.getElementById("app");
if (root) {
  const shell = mountShell(root, {
    requestedLocales: navigator.languages?.length ? navigator.languages : [navigator.language],
    store: safeLocalStorage(window),
    hashRouting: true,
    // Open the page with ?audit to log accessibility audit problems to the console.
    ...(new URLSearchParams(location.search).has("audit")
      ? { onAudit: (v: Violation[]) => v.length > 0 && console.warn("Audit:", v) }
      : {}),
  });
  void registerOffline(navigator, "./sw.js").then((s) => shell.setOfflineStatus(s));
}

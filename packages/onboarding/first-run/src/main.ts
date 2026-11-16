import { registerOffline } from "./register";
import { mountShell } from "./shell";
import { safeLocalStorage } from "./store";

/** Browser entry. Mounts the shell and sets up offline use. */
const root = document.getElementById("app");
if (root) {
  const shell = mountShell(root, {
    requestedLocales: navigator.languages?.length ? navigator.languages : [navigator.language],
    store: safeLocalStorage(window),
  });
  void registerOffline(navigator, "./sw.js").then((s) => shell.setOfflineStatus(s));
}

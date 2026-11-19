import { expect } from "vitest";
import type { Note } from "./model";
import { addNote } from "./outbox";
import { mountShell, type ShellHandle } from "./shell";
import { memoryStore, type KeyValueStore } from "./store";
import type { Violation } from "./audit";

/**
 * A small harness for screen tests: a fresh page, a store in memory, a fixed
 * day, and every audit result the shell reports. Each test makes its own.
 */
export interface Harness {
  readonly root: HTMLElement;
  readonly store: KeyValueStore;
  readonly audits: Violation[][];
  shell: ShellHandle | undefined;
  mount(locale?: string, hashRouting?: boolean): ShellHandle;
  seed(notes: readonly Note[]): void;
  click(selector: string): void;
  heading(): string;
  text(): string;
  status(): string;
  auditLines(): string[];
  destroy(): void;
}

export const act = (action: string, value?: string): string =>
  `[data-action="${action}"]` + (value !== undefined ? `[data-value="${value}"]` : "");

export function createHarness(today: Date): Harness {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = "";
  const root = document.getElementById("app") as HTMLElement;
  const store = memoryStore();
  const audits: Violation[][] = [];
  const h: Harness = {
    root,
    store,
    audits,
    shell: undefined,
    mount(locale = "en", hashRouting = false) {
      h.shell?.destroy();
      h.shell = mountShell(root, { requestedLocales: [locale], store, today, onAudit: (v) => audits.push(v), hashRouting });
      return h.shell;
    },
    seed(notes) {
      // Notes are added newest last, so the stored order matches the order given.
      for (const n of notes.slice().reverse()) addNote(store, n);
    },
    click(selector) {
      const el = root.querySelector<HTMLElement>(selector);
      expect(el, selector).not.toBeNull();
      el?.click();
    },
    heading: () => root.querySelector("h2")?.textContent ?? "",
    text: () => root.textContent ?? "",
    status: () => document.querySelector('[role="status"][aria-live]')?.textContent ?? "",
    auditLines: () => audits.flat().map((v) => `${v.rule}: ${v.detail}`),
    destroy() {
      h.shell?.destroy();
      h.shell = undefined;
    },
  };
  return h;
}

export const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } } as const;

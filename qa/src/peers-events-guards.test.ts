import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EVENT_NIGHT_STRINGS } from "../../apps/centre/src/events/strings.js";
import { SHELL_STRINGS } from "../../apps/centre/src/strings.js";
import { findBannedCopy } from "./audit/copy.js";
import { auditStringTables } from "./audit/i18n.js";
import { CENTRE_SCREENS } from "./audit/model.js";
import { pathsMissingFromSource, routePatterns, routesWithoutMenuLink, routesWithoutScreen } from "./audit/routes.js";
import { findForbiddenTerms } from "./guards/forbidden-terms.js";

/**
 * Guards for the peer request and the event-night screens in apps/centre. They read the
 * source so a later change cannot quietly drop a route, a menu link or an audit screen,
 * add a network call, or bring back a screen that pairs a person with another person.
 */
const root = fileURLToPath(new URL("../..", import.meta.url));
const read = (path: string) => readFileSync(join(root, path), "utf8");
const filesIn = (dir: string) =>
  readdirSync(join(root, dir))
    .filter((name) => /\.(ts|tsx|css)$/.test(name) && !/\.test\.tsx?$/.test(name))
    .map((name) => `${dir}/${name}`);

const app = read("apps/centre/src/App.tsx");
const patterns = routePatterns(app);
const ours = (path: string) => path.startsWith("/peers") || path.startsWith("/event-night");
const wiring = [...filesIn("apps/centre/src/peers"), ...filesIn("apps/centre/src/events")];
const screenPaths = CENTRE_SCREENS.map((screen) => screen.path as string);

describe("peer request and event night: routes and menus", () => {
  it("routes the peer request and the four event-night tools, with a landing screen", () => {
    expect(patterns.filter(ours).sort()).toEqual(["/event-night", "/event-night/journey", "/event-night/open", "/event-night/organiser", "/event-night/outing", "/peers/request"]);
  });

  it("links both from the primary menu, with a label in English and in French", () => {
    expect(app).toMatch(/<NavLink className="min-target" to="\/peers\/request">\{t\("peerRequest"\)\}<\/NavLink>/);
    expect(app).toMatch(/<NavLink className="min-target" to="\/event-night">\{t\("eventNight"\)\}<\/NavLink>/);
    expect(SHELL_STRINGS.en.peerRequest).toBe("Peer request");
    expect(SHELL_STRINGS.fr.peerRequest).toBe("Demande de pair");
    expect(SHELL_STRINGS.en.eventNight).toBe("Event night");
    expect(SHELL_STRINGS.fr.eventNight).toBe("Soirée d’événement");
  });

  it("links every event-night route from the event-night menu", () => {
    expect(routesWithoutMenuLink(patterns, "/event-night", read("apps/centre/src/events/EventNightNav.tsx"))).toEqual([]);
  });

  it("has a Day 17 audit screen and a release-run entry for every one of these routes", () => {
    expect(routesWithoutScreen(patterns.filter(ours), screenPaths)).toEqual([]);
    expect(pathsMissingFromSource(screenPaths.filter(ours), read("qa/tests/release.spec.ts"))).toEqual([]);
    expect(pathsMissingFromSource(screenPaths.filter(ours), read("qa/tests/peers-events.spec.ts"))).toEqual([]);
  });
});

describe("peer request and event night: copy", () => {
  it("has the same keys in English and French, with French typography", () => {
    const findings = auditStringTables([{ name: "event-night", en: EVENT_NIGHT_STRINGS.en, fr: EVENT_NIGHT_STRINGS.fr }]);
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });

  it("uses no banned word and names no forbidden organisation in the wiring", () => {
    expect(wiring.length).toBeGreaterThanOrEqual(6);
    for (const file of wiring) {
      const text = read(file);
      expect(findBannedCopy(text, file), file).toEqual([]);
      expect(findForbiddenTerms(text), file).toEqual([]);
    }
  });

  it("says that an organiser's answers are a statement and that nothing is sent", () => {
    expect(EVENT_NIGHT_STRINGS.en.notChecked).toMatch(/own statement/);
    expect(EVENT_NIGHT_STRINGS.en.notChecked).toMatch(/does not show them as confirmed/);
    expect(EVENT_NIGHT_STRINGS.fr.notChecked).toMatch(/ne les présente pas comme confirmées/);
    expect(EVENT_NIGHT_STRINGS.en.onDevice).toMatch(/Nothing is sent/);
    expect(EVENT_NIGHT_STRINGS.fr.onDevice).toMatch(/Rien n’est envoyé/);
  });
});

describe("peer request and event night: boundaries", () => {
  it("makes no network call, opens no channel and reads no location in the wiring", () => {
    for (const file of wiring) {
      const text = read(file);
      expect(text, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|navigator\.share|BroadcastChannel|https?:\/\/|mailto:|sms:|geolocation/);
    }
  });

  it("mounts the request flow only: no matching screen, matching code or made-up profiles anywhere in the centre", () => {
    const centre = [...filesIn("apps/centre/src"), ...wiring];
    for (const file of centre) {
      expect(read(file), file).not.toMatch(/PeerConnect\b|matchRequest|DEMONSTRATION_PEERS|MatchOffer|validateMatchOffer/);
    }
    expect(read("apps/centre/src/peers/PeerRequestPage.tsx")).toMatch(/import \{ PeerRequestFlow \} from "@access\/peers\/ui";/);
    expect(read("packages/peers/src/ui/index.ts")).not.toMatch(/PeerConnect/);
  });

  it("shows an organiser file through the package view, which never shows it as confirmed", () => {
    const views = read("apps/centre/src/events/EventNightViews.tsx");
    expect(views).toMatch(/<OpenOrganiserFile lang=\{language\} today=\{today\} \/>/);
    expect(views).not.toMatch(/EventAccessPage/);
    expect(read("packages/event-access/src/ui/OpenOrganiserFile.tsx")).toMatch(/origin="organiser_file" headingLevel=\{2\}/);
  });

  it("sets no literal colour in the event-night stylesheet, so the high contrast theme applies unchanged", () => {
    const css = read("apps/centre/src/events/event-night.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
    expect(css).not.toMatch(/(?<![\w-])(?:min-)?height\s*:\s*(?:[0-3]?\d)px/);
  });
});

import { describe, expect, it } from "vitest";
import { SCANNER_CLAIMS, findScannerClaim } from "./index";

describe("findScannerClaim", () => {
  it("catches English wording that says a scanner runs", () => {
    for (const text of [
      "The App starts scanning when you press Next.",
      "Start scanning to move through the list.",
      "It runs a scanner for you.",
      "Turn on the scanner in Setup.",
      "Enable automatic scanning.",
      "The App scans every item.",
      "The page automatically highlights each button.",
      "Items are automatically scanned.".replace("scanned", "scans"),
      "Scanning stays off until you start it.",
      "Scanning is off until you turn it on.",
    ]) {
      expect(findScannerClaim(text), text).toBeDefined();
    }
  });

  it("catches French wording that says a scanner runs", () => {
    for (const text of [
      "L’App lance le balayage quand vous appuyez sur Suivant.",
      "Elle démarre automatiquement le balayage.",
      "L’App balaie automatiquement la liste.",
      "Le balayage reste désactivé tant que vous ne le lancez pas.",
      "Active un balayage dans la configuration.",
    ]) {
      expect(findScannerClaim(text), text).toBeDefined();
    }
  });

  it("allows honest statements, including the negated ones", () => {
    for (const text of [
      "The App does not run a scanner.",
      "The App never starts scanning by itself.",
      "This is a preference only. The App doesn’t run a scanner.",
      "There is no scanning in the App.",
      "Scanning is never started automatically.",
      "Use your device’s own switch software.",
      "Choose a preferred highlight interval.",
      "L’App n’exécute pas de balayage.",
      "L’App ne lance jamais le balayage.",
      "Utilisez le logiciel de contacteur de votre appareil.",
      "Intervalle de surbrillance préféré",
    ]) {
      expect(findScannerClaim(text), text).toBeUndefined();
    }
  });

  it("has a pattern for each wording family", () => {
    expect(SCANNER_CLAIMS.length).toBeGreaterThanOrEqual(6);
    for (const re of SCANNER_CLAIMS) expect(re.flags).toContain("i");
  });
});

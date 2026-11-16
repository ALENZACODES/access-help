import { describe, expect, it } from "vitest";
import { screenConnectText } from "./health-screen.js";

describe("screenConnectText", () => {
  it.each([
    "",
    "I would like to talk about going back to work part time.",
    "Parenting two kids and getting to hockey practice.",
    "J'aimerais parler du retour au travail et des loisirs.",
    "Level 3 of my building has the gym I use.",
  ])("allows a life-context note: %s", (text) => {
    expect(screenConnectText(text)).toEqual({ decision: "allow" });
  });

  it.each([
    "I have paraplegia",
    "I am quadriplegic",
    "tetraplegia since last year",
    "My injury level is high",
    "C5 complete",
    "T12 incomplete injury",
    "L-1",
    "ASIA B",
    "after my spinal cord injury",
    "I had surgery in the spring",
    "just left the hospital",
    "living with multiple sclerosis",
    "I was diagnosed with depression",
    "Je suis paraplégique",
    "ma lésion médullaire",
    "niveau de la lésion",
    "après ma chirurgie",
    "sortie de l'hôpital",
    "blessure incomplète",
  ])("holds a diagnosis label, injury level or health detail: %s", (text) => {
    const result = screenConnectText(text);
    expect(result.decision).toBe("hold");
    if (result.decision !== "hold") return;
    expect(result.codes.some((code) => code === "health_detail" || code === "medical_advice")).toBe(true);
  });

  it("names the health-detail rule for a diagnosis label on its own", () => {
    expect(screenConnectText("I am quadriplegic")).toEqual({ decision: "hold", codes: ["health_detail"] });
  });

  it("keeps the package's clinical and contact-detail rules", () => {
    expect(screenConnectText("which medication works")).toEqual({ decision: "hold", codes: ["medical_advice"] });
    expect(screenConnectText("write to a.b@example.org")).toEqual({ decision: "hold", codes: ["personal_data"] });
    expect(screenConnectText("C5, call 416-555-0100")).toEqual({
      decision: "hold",
      codes: ["personal_data", "health_detail"],
    });
  });

  it("treats crisis wording as crisis ahead of every other rule", () => {
    expect(screenConnectText("I want to die").decision).toBe("crisis");
    expect(screenConnectText("paraplegia and I want to end my life").decision).toBe("crisis");
    expect(screenConnectText("J'ai envie de mourir").decision).toBe("crisis");
  });
});

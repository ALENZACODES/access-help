import { describe, expect, it } from "vitest";
import { compareBothSides, compareOnStreet, parseStreet, postalArea, streetKey } from "./streets";

const street = (a: string): [string | undefined, string | undefined] => {
  const s = parseStreet(a);
  return [s?.number, s?.name];
};

describe("parseStreet", () => {
  it("reads English street types after the name, in every spelling", () => {
    expect(street("12 King St")).toEqual(["12", "King Street"]);
    expect(street("12 King Street")).toEqual(["12", "King Street"]);
    expect(street("5 Rink Rd")).toEqual(["5", "Rink Road"]);
    expect(street("12A Elm Ave.")).toEqual(["12A", "Elm Avenue"]);
    expect(street("8 Bay Blvd")).toEqual(["8", "Bay Boulevard"]);
    expect(street("3 Oak Cres")).toEqual(["3", "Oak Crescent"]);
  });

  it("keeps directions, so King Street West and King Street East are different streets", () => {
    const w = parseStreet("12 King St W");
    const e = parseStreet("1 King St. E.");
    expect(w?.name).toBe("King Street West");
    expect(e?.name).toBe("King Street East");
    expect(w?.key).not.toBe(e?.key);
  });

  it("reads French street types before the name", () => {
    expect(street("1 rue King")).toEqual(["1", "rue King"]);
    expect(street("45, boul. Saint-Laurent")).toEqual(["45", "boulevard Saint-Laurent"]);
    expect(street("200 chemin du Lac")).toEqual(["200", "chemin Du Lac"]);
    expect(street("10 rue Principale Est")).toEqual(["10", "rue Principale Est"]);
  });

  it("reads Avenue Road as a road, not a French avenue", () => {
    expect(street("10 Avenue Rd")).toEqual(["10", "Avenue Road"]);
    expect(street("10 avenue Laurier")).toEqual(["10", "avenue Laurier"]);
  });

  it("finds the street after a unit, and in the usual unit-number form", () => {
    expect(street("Unit 4, 1 Main Street")).toEqual(["1", "Main Street"]);
    expect(street("Suite 300, 100 Queen St W")).toEqual(["100", "Queen Street West"]);
    expect(street("12-345 King St W")).toEqual(["345", "King Street West"]);
  });

  it("ignores the city and anything after the street", () => {
    expect(street("100 Queen Street West, Toronto")).toEqual(["100", "Queen Street West"]);
    expect(street("100 Queen St W, Toronto, ON M5H 2N2")).toEqual(["100", "Queen Street West"]);
  });

  it("matches the same street however it is spelled or capitalised", () => {
    const keys = ["12 King St W", "40 KING STREET WEST", "3 king st. w", "Unit 2, 9 King Street W"].map((a) => parseStreet(a)?.key);
    expect(new Set(keys).size).toBe(1);
    expect(parseStreet("1 Côte Ste-Catherine")?.key).toBe(parseStreet("2 cote ste-catherine")?.key);
  });

  it("gives no street when there is no house number followed by a street", () => {
    for (const a of [undefined, "", "King St", "PO Box 12, Elm St", "Toronto", "12", "12 34", "Unit 5"]) expect(parseStreet(a), String(a)).toBeUndefined();
  });

  it("keeps a street whose name is a number word", () => {
    expect(street("20 St. Clair Ave W")).toEqual(["20", "St Clair Avenue West"]);
    expect(street("1 10th Line")).toEqual(["1", "10th Line"]);
  });
});

describe("compareOnStreet", () => {
  const at = (a: string, name: string) => {
    const s = parseStreet(a);
    if (!s) throw new Error(a);
    return { street: s, name };
  };

  it("sorts by house number, numbers before letters, then by place name", () => {
    const list = [at("12A King St", "B"), at("100 King St", "C"), at("12 King St", "Z"), at("9 King St", "A"), at("12 King St", "Y")];
    expect(list.sort(compareOnStreet).map((x) => `${x.street.number} ${x.name}`)).toEqual(["9 A", "12 Y", "12 Z", "12A B", "100 C"]);
  });
});

describe("postalArea", () => {
  it("reads the first three characters of a Canadian postal code, with or without the space", () => {
    expect(postalArea("100 King St W, Toronto, ON M5H 2N2")).toBe("M5H");
    expect(postalArea("12 Queen St W, Toronto ON m5h3m9")).toBe("M5H");
    expect(postalArea("9 Lake Rd, Kingston, ON K7L 3N6, Canada")).toBe("K7L");
  });

  it("finds no postal code where there is none, or where the letters cannot be in one", () => {
    for (const a of [undefined, "", "5 Rink Rd", "Unit 4, 1 Main St", "D5H 2N2", "M5H 2N", "AM5H 2N2", "M5H 2N2X"]) expect(postalArea(a), String(a)).toBeUndefined();
  });
});

describe("compareBothSides", () => {
  const at = (a: string) => {
    const s = parseStreet(a);
    if (!s) throw new Error(a);
    return { street: s, name: a };
  };

  it("goes up the odd side and comes back down the even side", () => {
    const list = ["2 Elm Ave", "7 Elm Ave", "1 Elm Ave", "10 Elm Ave", "3 Elm Ave", "4 Elm Ave"].map(at);
    expect(list.sort(compareBothSides).map((x) => x.street.number)).toEqual(["1", "3", "7", "10", "4", "2"]);
  });

  it("keeps 12 and 12A together on the same side", () => {
    const list = ["12A Elm Ave", "12 Elm Ave", "14 Elm Ave"].map(at);
    expect(list.sort(compareBothSides).map((x) => x.street.number)).toEqual(["14", "12", "12A"]);
  });
});

describe("units after the street", () => {
  it("drops a unit written after the street", () => {
    expect(street("12 King St W #300")).toEqual(["12", "King Street West"]);
    expect(street("1 Main St Suite 4")).toEqual(["1", "Main Street"]);
    expect(street("5 rue Principale app. 2")).toEqual(["5", "rue Principale"]);
    expect(parseStreet("12 King St W #300")?.key).toBe(parseStreet("40 King Street West")?.key);
  });

  it("keeps a street whose last word only looks like a unit word", () => {
    expect(street("3 Unit Rd")).toEqual(["3", "Unit Road"]);
  });
});

describe("streetKey", () => {
  it("reads St, Saint, Ste and Sainte alike at the start of a name", () => {
    expect(streetKey("St Clair Avenue West")).toBe(streetKey("Saint Clair Avenue West"));
    expect(parseStreet("1 St. Clair Ave W")?.key).toBe(parseStreet("2 Saint Clair Avenue West")?.key);
    expect(parseStreet("1 rue Ste-Catherine")?.key).toBe(parseStreet("2 rue Sainte-Catherine")?.key);
  });

  it("does not change St as the street type at the end, and keeps Saint and Sainte apart", () => {
    expect(streetKey("King St")).toBe("king st");
    expect(streetKey("Saint Laurent")).not.toBe(streetKey("Sainte Laurent"));
  });
});

import { describe, expect, it } from "vitest";
import { LICENCE_TICKS_KEY, cleanLicenceTicks, clearLicenceTicksData, createLicenceTicksStore, parseStoredLicenceTicks } from "./licenceTicksStore.js";
import { clearPlacesData } from "./store.js";
import { MemoryStorage } from "./testing.js";

describe("licence ticks store", () => {
  it("starts empty", () => {
    expect(createLicenceTicksStore(new MemoryStorage()).read()).toEqual([]);
  });
  it("saves ticks and reads them back in order", () => {
    const storage = new MemoryStorage();
    const store = createLicenceTicksStore(storage);
    expect(store.save(["read-licence", "credit-placed"])).toEqual({ ok: true });
    expect(store.read()).toEqual(["read-licence", "credit-placed"]);
    expect(storage.getItem(LICENCE_TICKS_KEY)).toBe('["read-licence","credit-placed"]');
  });
  it("removes the key when the last tick is taken off", () => {
    const storage = new MemoryStorage();
    const store = createLicenceTicksStore(storage);
    store.save(["read-licence"]);
    store.save([]);
    expect(storage.getItem(LICENCE_TICKS_KEY)).toBeNull();
  });
  it("keeps known ids only, each once", () => {
    expect(cleanLicenceTicks(["read-licence", "nonsense", 7, null, "read-licence", "open-copy"])).toEqual(["read-licence", "open-copy"]);
    expect(cleanLicenceTicks("read-licence")).toEqual([]);
    expect(cleanLicenceTicks({ 0: "read-licence" })).toEqual([]);
  });
  it("reads damaged storage as no ticks", () => {
    expect(parseStoredLicenceTicks("{not json")).toEqual([]);
    expect(parseStoredLicenceTicks(null)).toEqual([]);
    expect(parseStoredLicenceTicks('["<script>","own-eyes-map"]')).toEqual(["own-eyes-map"]);
  });
  it("reports a refused write instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error("refused");
    };
    expect(createLicenceTicksStore(storage).save(["read-licence"])).toEqual({ ok: false, reason: "storage-unavailable" });
  });
  it("reads as empty when storage cannot be read", () => {
    const storage = new MemoryStorage();
    storage.getItem = () => {
      throw new Error("refused");
    };
    expect(createLicenceTicksStore(storage).read()).toEqual([]);
  });
  it("is cleared on its own and with the rest of the places data", () => {
    const storage = new MemoryStorage();
    createLicenceTicksStore(storage).save(["read-licence"]);
    clearLicenceTicksData(storage);
    expect(storage.getItem(LICENCE_TICKS_KEY)).toBeNull();
    createLicenceTicksStore(storage).save(["read-licence"]);
    clearPlacesData(storage);
    expect(storage.getItem(LICENCE_TICKS_KEY)).toBeNull();
  });
});

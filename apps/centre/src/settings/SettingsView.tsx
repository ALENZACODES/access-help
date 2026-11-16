import { useState, type ChangeEvent } from "react";
import { createBackup, restoreBackup } from "../places/backup.js";
import { localToday } from "../places/today.js";
import { clearPlacesData, type KeyValueStorage } from "../places/store.js";
import { OfflineReadiness } from "./OfflineReadiness.js";
import {
  CONTRASTS,
  SPACINGS,
  TEXT_SIZES,
  applyPrefs,
  defaultPrefs,
  loadPrefs,
  resetPrefs,
  savePrefs,
  systemWantsMoreContrast,
  type Prefs,
} from "./prefs.js";
import { settingsText, type SettingsKey } from "./strings.js";

type Language = "en" | "fr";

const SIZE_KEY = { standard: "sizeStandard", large: "sizeLarge", larger: "sizeLarger" } as const;
const CONTRAST_KEY = { standard: "contrastStandard", high: "contrastHigh" } as const;
const SPACING_KEY = { standard: "spacingStandard", wide: "spacingWide" } as const;

export function SettingsView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(storage, systemWantsMoreContrast()));
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ error: boolean; text: string } | null>(null);
  const t = (key: SettingsKey, vars?: Record<string, string | number>) => settingsText(language, key, vars);
  const radioName = "prefs";

  function change(next: Prefs) {
    setPrefs(next);
    applyPrefs(next, document.documentElement);
    setMessage(savePrefs(storage, next) ? t("saved") : t("saveFailed"));
  }

  function reset() {
    resetPrefs(storage);
    const next = defaultPrefs(systemWantsMoreContrast());
    setPrefs(next);
    applyPrefs(next, document.documentElement);
    setMessage(t("resetDone"));
  }

  function saveBackup() {
    const url = URL.createObjectURL(new Blob([createBackup(storage, localToday())], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `the-app-backup-${localToday()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupMessage({ error: false, text: t("backupSaved") });
  }

  async function onBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const result = restoreBackup(await file.text(), storage);
    input.value = "";
    if (!result.ok) {
      setBackupMessage({ error: true, text: `${t("backupFailedPrefix")} ${t(`backupFail.${result.code}` as SettingsKey)}` });
      return;
    }
    if (result.prefs) {
      setPrefs(result.prefs);
      applyPrefs(result.prefs, document.documentElement);
    }
    const { summary } = result;
    const base = t("backupRestored", {
      packs: summary.packs,
      drafts: summary.drafts,
      saved: summary.saved,
      prefs: t(summary.prefsRestored ? "backupPrefsYes" : "backupPrefsNo"),
    });
    setBackupMessage({ error: false, text: summary.skipped > 0 ? `${base} ${t("backupSkipped", { count: summary.skipped })}` : base });
  }

  function clearAll() {
    clearPlacesData(storage);
    setConfirming(false);
    setMessage(t("cleared"));
  }

  return (
    <div className="settings">
      <h1>{t("title")}</h1>
      <p>{t("lead")}</p>

      <section aria-labelledby="display-heading">
        <h2 id="display-heading">{t("displayHeading")}</h2>
        <fieldset>
          <legend>{t("textSizeLegend")}</legend>
          {TEXT_SIZES.map((size) => (
            <label key={size}>
              <input type="radio" name={`${radioName}-size`} checked={prefs.textSize === size} onChange={() => change({ ...prefs, textSize: size })} />
              {t(SIZE_KEY[size])}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>{t("contrastLegend")}</legend>
          {CONTRASTS.map((contrast) => (
            <label key={contrast}>
              <input type="radio" name={`${radioName}-contrast`} checked={prefs.contrast === contrast} onChange={() => change({ ...prefs, contrast })} />
              {t(CONTRAST_KEY[contrast])}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>{t("spacingLegend")}</legend>
          {SPACINGS.map((spacing) => (
            <label key={spacing}>
              <input type="radio" name={`${radioName}-spacing`} checked={prefs.spacing === spacing} onChange={() => change({ ...prefs, spacing })} />
              {t(SPACING_KEY[spacing])}
            </label>
          ))}
        </fieldset>
        <p>
          <button type="button" onClick={reset}>
            {t("reset")}
          </button>
        </p>
        <div role="status" aria-live="polite">
          {message}
        </div>
      </section>

      <OfflineReadiness language={language} storage={storage} />

      <section aria-labelledby="backup-heading">
        <h2 id="backup-heading">{t("backupHeading")}</h2>
        <p>{t("backupLead")}</p>
        <p>
          <button type="button" onClick={saveBackup}>
            {t("backupSave")}
          </button>
        </p>
        <label htmlFor="backup-file">{t("backupRestoreLabel")}</label>
        <p id="backup-file-help" className="hint">
          {t("backupRestoreHelp")}
        </p>
        <input id="backup-file" type="file" accept=".json,application/json" aria-describedby="backup-file-help" onChange={(event) => void onBackupFile(event)} />
        <div role="status" aria-live="polite">
          {backupMessage && !backupMessage.error ? backupMessage.text : null}
        </div>
        <div role="alert">{backupMessage?.error ? backupMessage.text : null}</div>
      </section>

      <section aria-labelledby="data-heading">
        <h2 id="data-heading">{t("dataHeading")}</h2>
        <p>{t("dataLead")}</p>
        {confirming ? (
          <div role="group" aria-label={t("clearConfirm")}>
            <p>{t("clearConfirm")}</p>
            <p className="places-actions">
              <button type="button" onClick={clearAll}>
                {t("clearYes")}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setConfirming(false);
                  setMessage(t("kept"));
                }}
              >
                {t("clearNo")}
              </button>
            </p>
          </div>
        ) : (
          <p>
            <button type="button" onClick={() => setConfirming(true)}>
              {t("clearButton")}
            </button>
          </p>
        )}
      </section>
    </div>
  );
}

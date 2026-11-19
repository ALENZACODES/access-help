import { useEffect, useRef } from "react";
import {
  downloadFile, finderHash, loadStoredPlaces, openStorage, safeStore, speakText, storePlaces, todayIso, withFinderHash,
  type DownloadHost, type SpeechHost,
} from "./browserHost.js";
import { mountPlaceFinder, type FinderController, type FinderRoot } from "./finderMount.js";
import { FINDER_CSS } from "./finderRender.js";
import { UI, type Language } from "./strings.js";

const downloads: DownloadHost = {
  createUrl: (text, mime) => URL.createObjectURL(new Blob([text], { type: mime })),
  revokeUrl: (url) => { window.setTimeout(() => URL.revokeObjectURL(url), 1000); },
  click: (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
  },
};

function speechHost(): SpeechHost | null {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return null;
  return {
    cancel: () => { window.speechSynthesis.cancel(); },
    speak: (text, langTag) => {
      const said = new SpeechSynthesisUtterance(text);
      said.lang = langTag;
      window.speechSynthesis.speak(said);
    },
  };
}

/**
 * The place finder, hosted in the page. Everything stays on this device: choices and the person's
 * own notes in the browser's storage, and the records as a table with a source, licence, date and
 * tier on each row. There is no shipped place data; the person loads a table of records.
 */
export function PlacesView({ language }: { readonly language: Language }) {
  const host = useRef<HTMLDivElement>(null);
  const style = useRef<HTMLStyleElement>(null);
  const finder = useRef<FinderController | null>(null);
  const strings = UI[language];

  useEffect(() => {
    const root = host.current;
    if (root === null || finder.current !== null) return undefined;
    const store = safeStore(openStorage(() => window.localStorage));
    const speech = speechHost();
    const controller = mountPlaceFinder(root as unknown as FinderRoot, {
      lang: language,
      places: loadStoredPlaces(store),
      today: todayIso(new Date()),
      store,
      hash: {
        get: () => finderHash(window.location.hash),
        set: (choices) => { window.history.replaceState(null, "", withFinderHash(choices)); },
      },
      isOnline: () => navigator.onLine,
      applyStyles: (css) => { if (style.current !== null) style.current.textContent = `${FINDER_CSS}\n${css}`; },
      systemReducedMotion: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      onExport: (file) => { downloadFile(file, downloads); },
      onRecords: (places) => { storePlaces(store, places); },
      ...(speech === null ? {} : { onSpeak: (text: string, lang: Language) => { speakText(text, lang, speech); } }),
    });
    finder.current = controller;
    const refresh = (): void => { controller.refreshConnection(); };
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
    // The finder is mounted once; the language is passed on by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { finder.current?.setLang(language); }, [language]);

  return (
    <>
      <style ref={style}>{FINDER_CSS}</style>
      <h1>{strings.placesHeading}</h1>
      <p>{strings.placesLead}</p>
      <div ref={host} className="places-host" />
    </>
  );
}

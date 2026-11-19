import { useEffect, useRef } from "react";
import { downloadFile, todayIso, type DownloadHost } from "./browserHost.js";
import { FINDER_CSS } from "./finderRender.js";
import type { Language } from "./strings.js";
import { WORDINGCHECK_UI, mountWordingCheck, type WordingController, type WordingRoot } from "./wordingCheck.js";

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

/**
 * The wording check, hosted in the page. The text a person types stays in the page: it is not
 * stored and it is not sent anywhere. The advice can be saved as a text file on the device.
 */
export function WordingView({ language }: { readonly language: Language }) {
  const host = useRef<HTMLDivElement>(null);
  const tool = useRef<WordingController | null>(null);

  useEffect(() => {
    const root = host.current;
    if (root === null || tool.current !== null) return;
    tool.current = mountWordingCheck(root as unknown as WordingRoot, {
      lang: language,
      today: todayIso(new Date()),
      onExport: (file) => { downloadFile(file, downloads); },
    });
    // The tool is mounted once; the language is passed on by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { tool.current?.setLang(language); }, [language]);

  return (
    <>
      <style>{FINDER_CSS}</style>
      <h1>{WORDINGCHECK_UI[language].heading}</h1>
      <div ref={host} className="wording-host" />
    </>
  );
}

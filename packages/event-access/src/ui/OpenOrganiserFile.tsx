import { useState, type ChangeEvent } from "react";
import { interpolate, messages, type MessageKey } from "../i18n.js";
import { MAX_FILE_CHARS, parseOrganiserFile, type FileErrorCode, type OrganiserFile } from "../organiser.js";
import type { Lang } from "../types.js";
import { EventAccessPage } from "./EventAccessPage.js";

export interface OpenOrganiserFileProps {
  lang: Lang;
  /** Today on this device, YYYY-MM-DD. */
  today: string;
  /** A file already read, so the opened state can be shown without the picker. */
  initialFile?: OrganiserFile;
}

type Problem = FileErrorCode | "read";

/** Open a file an organiser shared. It is read on this device with the browser's file picker; nothing is uploaded. */
export function OpenOrganiserFile({ lang, today, initialFile }: OpenOrganiserFileProps) {
  const m = messages[lang];
  const [file, setFile] = useState<OrganiserFile | null>(initialFile ?? null);
  const [problem, setProblem] = useState<Problem | null>(null);

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;
    setFile(null);
    if (picked.size > MAX_FILE_CHARS * 4) {
      setProblem("too_large");
      return;
    }
    try {
      const parsed = parseOrganiserFile(await picked.text());
      if (parsed.ok) {
        setProblem(null);
        setFile(parsed.file);
      } else {
        setProblem(parsed.error);
      }
    } catch {
      setProblem("read");
    }
  };

  return (
    <>
      <section className="page" lang={lang} aria-labelledby="open-title">
        <h1 id="open-title">{m.openHeading}</h1>
        <p className="lede">{m.openIntro}</p>
        <div className="control">
          <label htmlFor="open-file">{m.openLabel}</label>
          <input
            id="open-file"
            type="file"
            accept="application/json,.json"
            onChange={(e) => void onPick(e)}
            {...(problem ? { "aria-describedby": "open-error", "aria-invalid": true } : {})}
          />
        </div>
        <p role="alert" id="open-error" className={problem ? "error" : undefined} data-open-error={problem ?? ""}>
          {problem ? m[`openError_${problem}` as MessageKey] : ""}
        </p>
        {file ? <p data-open-exported="true">{interpolate(m.openExportedOn, { date: file.exportedOn })}</p> : null}
      </section>
      {file ? <EventAccessPage record={file.record} lang={lang} today={today} origin="organiser_file" headingLevel={2} /> : null}
    </>
  );
}

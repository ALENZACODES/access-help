import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FIRST_RUN_META,
  MIN_TOUCH_TARGET_PX,
  mountShell,
  type Locale,
} from "@access/onboarding";

interface FirstRunPageProps {
  language: Locale;
}

/** Live route for the combined first-run shell. The shell provides the page heading. */
export function FirstRunPage({ language }: FirstRunPageProps) {
  const english = language === "en";
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const handle = mountShell(host, {
      requestedLocales: [language],
      store: window.localStorage,
    });
    return () => handle.destroy();
  }, [language]);

  return (
    <>
      <div ref={hostRef} />
      <p>
        {english
          ? `Source: ${FIRST_RUN_META.source}. Licence: ${FIRST_RUN_META.licence}. Dated ${FIRST_RUN_META.date}.`
          : `Source\u00a0: ${FIRST_RUN_META.source}. Licence\u00a0: ${FIRST_RUN_META.licence}. Daté du ${FIRST_RUN_META.date}.`}
      </p>
      <p>
        <Link
          to="/onboarding"
          className="min-target"
          style={{
            minHeight: MIN_TOUCH_TARGET_PX,
            minWidth: MIN_TOUCH_TARGET_PX,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {english ? "Back to Get started" : "Retour à Pour commencer"}
        </Link>
      </p>
    </>
  );
}

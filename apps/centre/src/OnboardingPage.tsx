import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  MIN_TOUCH_TARGET_PX,
  ONBOARDING_PATHS,
  PATHS_META,
  SWITCH_FIRST_META,
  attachRovingFocus,
  initialState,
  localizePath,
  reduce,
  renderStep,
  type FirstRunAction,
  type FirstRunState,
  type Locale,
  type MoveMode,
  type ScanMs,
} from "@access/onboarding";

interface OnboardingPageProps {
  language: Locale;
}

function SwitchFirstPath({ language }: { language: Locale }) {
  const english = language === "en";
  const [state, setState] = useState<FirstRunState>(() => initialState());
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = renderStep(state, language);
    const group = host.querySelector<HTMLElement>('[role="group"]');
    const detach = group ? attachRovingFocus(group) : () => undefined;
    const onClick = (event: Event) => {
      const button = (event.target as HTMLElement | null)?.closest?.("button");
      if (!button || !host.contains(button)) return;
      const action = button.getAttribute("data-action");
      const value = button.getAttribute("data-value");
      let next: FirstRunAction | null = null;
      if (action === "choose-mode" && value) {
        next = { type: "choose-mode", mode: value as MoveMode };
      } else if (action === "set-scan" && value) {
        next = { type: "set-scan", ms: Number(value) as ScanMs };
      } else if (action === "next" || action === "back" || action === "skip") {
        next = { type: action };
      } else if (action === "done") {
        setState(initialState());
        return;
      }
      if (next) {
        const applied = next;
        setState((current) => reduce(current, applied));
      }
    };
    host.addEventListener("click", onClick);
    return () => {
      detach();
      host.removeEventListener("click", onClick);
    };
  }, [state, language]);

  return (
    <section aria-label={english ? "Keyboard or switch first-run path" : "Parcours de premier lancement au clavier ou à l’interrupteur"}>
      <p>
        {english
          ? "A first-run path that can be completed with a keyboard or a switch. Scanning does not start on its own. Choices you skip stay unknown."
          : "Un parcours de premier lancement que l’on peut suivre au clavier ou à l’interrupteur. Le balayage ne démarre pas tout seul. Les choix non faits restent inconnus."}
      </p>
      <div ref={hostRef} />
      <p>
        {english
          ? `Source: ${SWITCH_FIRST_META.source}. Licence: ${SWITCH_FIRST_META.licence}. Dated ${SWITCH_FIRST_META.date}.`
          : `Source${nbsp}: ${SWITCH_FIRST_META.source}. Licence${nbsp}: ${SWITCH_FIRST_META.licence}. Daté du ${SWITCH_FIRST_META.date}.`}
      </p>
    </section>
  );
}

export function OnboardingPage({ language }: OnboardingPageProps) {
  const english = language === "en";
  return (
    <>
      <h1>{english ? "Get started" : "Pour commencer"}</h1>
      <p>
        {english
          ? "Three short paths for finding a place, adding a detail, and opening help. This is navigation help only. It is not medical or eligibility advice."
          : "Trois courts parcours pour trouver un lieu, ajouter un détail et ouvrir l’aide. Il s’agit d’une aide à la navigation seulement. Ce n’est pas un avis médical ni d’admissibilité."}
      </p>
      {ONBOARDING_PATHS.map((path) => {
        const localized = localizePath(path, language);
        return (
          <section key={path.id} aria-labelledby={`onboarding-${path.id}`}>
            <h2 id={`onboarding-${path.id}`}>{localized.title}</h2>
            <p>{localized.summary}</p>
            <ol>
              {localized.steps.map((step, index) => (
                <li key={step.id}>
                  <h3>{`${index + 1}. ${step.title}`}</h3>
                  <p>{step.body}</p>
                  {step.href && step.linkLabel ? (
                    <p>
                      <Link
                        to={step.href}
                        className="min-target"
                        style={{
                          minHeight: MIN_TOUCH_TARGET_PX,
                          minWidth: MIN_TOUCH_TARGET_PX,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        {step.linkLabel}
                      </Link>
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      <SwitchFirstPath language={language} />
      <p>
        {english
          ? `Source: ${PATHS_META.source}. Licence: ${PATHS_META.licence}. Dated ${PATHS_META.date}.`
          : `Source${nbsp}: ${PATHS_META.source}. Licence${nbsp}: ${PATHS_META.licence}. Daté du ${PATHS_META.date}.`}
      </p>
      <p>
        <Link to="/" className="min-target" style={{ minHeight: MIN_TOUCH_TARGET_PX, minWidth: MIN_TOUCH_TARGET_PX, display: "inline-flex", alignItems: "center" }}>
          {english ? "Open help" : "Ouvrir l’aide"}
        </Link>
      </p>
    </>
  );
}

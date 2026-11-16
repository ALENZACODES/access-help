import { Link } from "react-router-dom";
import {
  MIN_TOUCH_TARGET_PX,
  ONBOARDING_PATHS,
  PATHS_META,
  localizePath,
  type Locale,
} from "@access/onboarding";

interface OnboardingPageProps {
  language: Locale;
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
      <p>
        {english
          ? `Source: ${PATHS_META.source}. Licence: ${PATHS_META.licence}. Dated ${PATHS_META.date}.`
          : `Source${"\u00a0"}: ${PATHS_META.source}. Licence${"\u00a0"}: ${PATHS_META.licence}. Daté du ${PATHS_META.date}.`}
      </p>
      <p>
        <Link to="/" className="min-target" style={{ minHeight: MIN_TOUCH_TARGET_PX, minWidth: MIN_TOUCH_TARGET_PX, display: "inline-flex", alignItems: "center" }}>
          {english ? "Open help" : "Ouvrir l’aide"}
        </Link>
      </p>
    </>
  );
}

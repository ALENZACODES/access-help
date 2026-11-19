import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HELP_ARTICLES,
  browserHelpCache,
  bundledHelpPack,
  createLanguagePreference,
  htmlLang,
  type Language,
} from "@access/help";
import { ArticleView, HelpSearch } from "@access/help/ui";
import { DirectoryList, EventDetail, EventList, ModerationExplainer, ReviewPractice } from "@access/community/ui";
import { DemoRecordView } from "@access/followup/ui";
import { OnboardingPage } from "./OnboardingPage.js";
import { FirstRunPage } from "./FirstRunPage.js";
import { GlossaryPage } from "./GlossaryPage.js";
import { BUILD_ID } from "./build.js";
import {
  ChangesView,
  CompareView,
  ContributeView,
  DaysView,
  DuplicatesView,
  ImportView,
  InspectView,
  MappingDayView,
  MineView,
  PlaceDetail,
  PlacesBrowse,
  PlacesStatus,
  PlanView,
  PresubmitView,
  QualityView,
  ReviewView,
  RevisitView,
  SavedView,
  SourcesView,
  SubmissionsView,
} from "./places/index.js";
import { SettingsView } from "./settings/index.js";
import { PeerRequestPage } from "./peers/index.js";
import { EventJourneyView, EventNightHome, EventOpenFileView, EventOrganiserView, EventOutingView } from "./events/index.js";
import { RouteFocus } from "./shell/RouteFocus.js";

const preference = createLanguagePreference(window.localStorage);

export function App() {
  const { t, i18n: instance } = useTranslation();
  const navigate = useNavigate();
  const language: Language = instance.language.startsWith("fr") ? "fr" : "en";
  const [query, setQuery] = useState("");
  const [packSavedAt, setPackSavedAt] = useState<string | null>(null);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);

  useEffect(() => {
    const stored = preference.get();
    if (stored !== language) {
      void instance.changeLanguage(stored);
    }
    document.documentElement.lang = htmlLang(stored);
  }, [instance, language]);

  useEffect(() => {
    document.documentElement.lang = htmlLang(language);
  }, [language]);

  useEffect(() => {
    const savedAt = new Date().toISOString();
    void browserHelpCache()
      .save(bundledHelpPack(savedAt))
      .then(() => setPackSavedAt(savedAt));
  }, []);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  function choose(next: Language) {
    preference.set(next);
    void instance.changeLanguage(next);
  }

  return (
    <>
      <a className="skip" href="#main">
        {t("skip")}
      </a>
      <header className="banner">
        <p className="wordmark">{t("appName")}</p>
        <p className="prototype">{t("prototype")}</p>
        <p className="build">
          {language === "fr" ? "Identifiant de build : " : "Build identifier: "}{BUILD_ID}
        </p>
        <nav aria-label={language === "fr" ? "Principal" : "Primary"}>
          <NavLink className="min-target" to="/">{t("help")}</NavLink>
          <NavLink className="min-target" to="/onboarding">{t("onboarding")}</NavLink>
          <NavLink className="min-target" to="/glossary">{t("glossary")}</NavLink>
          <NavLink className="min-target" to="/places">{t("places")}</NavLink>
          <NavLink className="min-target" to="/community">{t("community")}</NavLink>
          <NavLink className="min-target" to="/community/events">{t("events")}</NavLink>
          <NavLink className="min-target" to="/community/safety">{t("safety")}</NavLink>
          <NavLink className="min-target" to="/peers/request">{t("peerRequest")}</NavLink>
          <NavLink className="min-target" to="/event-night">{t("eventNight")}</NavLink>
          <NavLink className="min-target" to="/settings">{t("settings")}</NavLink>
          <NavLink className="min-target" to="/about">{t("about")}</NavLink>
          <a className="min-target" href="tel:911">{t("call911")}</a>
        </nav>
        <div className="languages" role="group" aria-label={t("languageGroup")}>
          <button type="button" aria-pressed={language === "en"} onClick={() => choose("en")}>
            {t("english")}
          </button>
          <button type="button" aria-pressed={language === "fr"} onClick={() => choose("fr")}>
            {t("french")}
          </button>
          <span className="visually-hidden" role="status">
            {t("languageNow")}
          </span>
        </div>
      </header>
      {offline ? (
        <p className="offline" role="status">
          {t("offline")}
        </p>
      ) : null}
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <h1>{t("help")}</h1>
                <p>{t("homeLead")}</p>
                <p>
                  <Link className="min-target home-onboarding-link" to="/onboarding">{t("onboardingLead")}</Link>
                </p>
                <HelpSearch
                  articles={HELP_ARTICLES}
                  language={language}
                  query={query}
                  onQueryChange={setQuery}
                  onOpen={(id) => {
                    navigate(`/help/${id}`);
                  }}
                />
                <h2>{t("articlesHeading")}</h2>
                <ArticleIndex language={language} />
              </>
            }
          />
          <Route path="/help/:id" element={<ArticleRoute language={language} packSavedAt={packSavedAt} />} />
          <Route path="/onboarding" element={<OnboardingPage language={language} />} />
          <Route path="/onboarding/first-run" element={<FirstRunPage language={language} />} />
          <Route path="/glossary" element={<GlossaryPage language={language} />} />
          <Route path="/community" element={<DirectoryList language={language} />} />
          <Route
            path="/community/events"
            element={<EventList language={language} onOpen={(id) => navigate(`/community/events/${id}`)} />}
          />
          <Route path="/community/events/:id" element={<EventRoute language={language} />} />
          <Route
            path="/community/safety"
            element={
              <>
                <ModerationExplainer language={language} />
                <p>
                  <Link to="/practice">{t("practiceLink")}</Link>
                </p>
              </>
            }
          />
          <Route path="/practice" element={<ReviewPractice language={language} />} />
          <Route path="/places" element={<PlacesBrowse language={language} storage={window.localStorage} />} />
          <Route path="/places/status" element={<PlacesStatus language={language} storage={window.localStorage} />} />
          <Route path="/places/submissions" element={<SubmissionsView language={language} storage={window.localStorage} />} />
          <Route path="/places/compare" element={<CompareView language={language} storage={window.localStorage} />} />
          <Route path="/places/days" element={<DaysView language={language} storage={window.localStorage} />} />
          <Route path="/places/duplicates" element={<DuplicatesView language={language} storage={window.localStorage} />} />
          <Route path="/places/mine" element={<MineView language={language} storage={window.localStorage} />} />
          <Route path="/places/revisit" element={<RevisitView language={language} storage={window.localStorage} />} />
          <Route path="/places/import" element={<ImportView language={language} storage={window.localStorage} />} />
          <Route path="/places/check" element={<PresubmitView language={language} storage={window.localStorage} />} />
          <Route path="/places/mapping-day" element={<MappingDayView language={language} storage={window.localStorage} />} />
          <Route path="/places/contribute" element={<ContributeView language={language} storage={window.localStorage} />} />
          <Route path="/places/review" element={<ReviewView language={language} storage={window.localStorage} />} />
          <Route path="/places/saved" element={<SavedView language={language} storage={window.localStorage} />} />
          <Route path="/places/plan" element={<PlanView language={language} storage={window.localStorage} />} />
          <Route path="/places/sources" element={<SourcesView language={language} storage={window.localStorage} />} />
          <Route path="/places/quality" element={<QualityView language={language} storage={window.localStorage} />} />
          <Route path="/places/changes" element={<ChangesView language={language} storage={window.localStorage} />} />
          <Route path="/places/inspect" element={<InspectView language={language} storage={window.localStorage} />} />
          <Route path="/places/:id" element={<PlaceDetail language={language} storage={window.localStorage} />} />
          <Route path="/peers/request" element={<PeerRequestPage language={language} storage={window.localStorage} />} />
          <Route path="/event-night" element={<EventNightHome language={language} />} />
          <Route path="/event-night/organiser" element={<EventOrganiserView language={language} />} />
          <Route path="/event-night/open" element={<EventOpenFileView language={language} />} />
          <Route path="/event-night/journey" element={<EventJourneyView language={language} />} />
          <Route path="/event-night/outing" element={<EventOutingView language={language} />} />
          <Route path="/settings" element={<SettingsView language={language} storage={window.localStorage} />} />
          <Route path="/demo-record" element={<DemoRecordView language={language} storage={window.localStorage} />} />
          <Route path="/about" element={<About language={language} packSavedAt={packSavedAt} />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        <RouteFocus language={language} />
      </main>
      <footer>
        <p>
          {language === "fr"
            ? "Aucune organisation, agence ou entreprise n'a approuvé l'application. L'application ne donne pas de conseil médical."
            : "No organisation, agency, or company has endorsed the App. The App does not give medical advice."}
        </p>
      </footer>
    </>
  );
}

function PageNotFound() {
  const { t } = useTranslation();
  return (
    <>
      <h1>{t("notFoundTitle")}</h1>
      <p>{t("notFoundBody")}</p>
      <p>
        <Link to="/">{t("openHelp")}</Link>
      </p>
      <p>
        <Link to="/about">{t("openAbout")}</Link>
      </p>
    </>
  );
}

function ArticleIndex({ language }: { language: Language }) {
  return (
    <ul className="link-list">
      {HELP_ARTICLES.map((article) => (
        <li key={article.id}>
          <Link to={`/help/${article.id}`}>{article[language].title}</Link>
        </li>
      ))}
    </ul>
  );
}

function ArticleRoute({ language, packSavedAt }: { language: Language; packSavedAt: string | null }) {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const article = HELP_ARTICLES.find((item) => item.id === params.id);
  if (!article) {
    return (
      <>
        <h1>{t("articleNotFoundTitle")}</h1>
        <p>{t("articleNotFoundBody")}</p>
        <p>
          <Link to="/">{t("openHelp")}</Link>
        </p>
      </>
    );
  }
  return (
    <>
      <p>
        <button type="button" onClick={() => navigate("/")}>
          {t("back")}
        </button>
      </p>
      <ArticleView article={article} language={language} packSavedAt={packSavedAt} />
    </>
  );
}

function EventRoute({ language }: { language: Language }) {
  const params = useParams();
  const navigate = useNavigate();
  return (
    <>
      <p>
        <button type="button" onClick={() => navigate("/community/events")}>
          {language === "fr" ? "Retour aux événements" : "Back to events"}
        </button>
      </p>
      <EventDetail language={language} id={params.id ?? ""} />
    </>
  );
}

function About({ language, packSavedAt }: { language: Language; packSavedAt: string | null }) {
  const articleCount = HELP_ARTICLES.length;
  const english = language === "en";
  return (
    <article>
      <h1>{english ? "About" : "À propos"}</h1>
      <p>
        {english
          ? "This is a prototype of the help centre and the community skeleton. It is not a launched service."
          : "Ceci est un prototype du centre d'aide et du squelette communautaire. Ce n'est pas un service lancé."}
      </p>
      <p>
        {english ? "Build identifier: " : "Identifiant de build : "}{BUILD_ID}
      </p>
      <h2>{english ? "Counts in this repository" : "Comptes dans ce dépôt"}</h2>
      <ul>
        <li>
          {english ? "Help articles: " : "Articles d'aide : "}{articleCount}, {english ? "tier" : "niveau"} PROTOTYPE-UNVERIFIED
        </li>
        <li>
          {english ? "Demonstration events: " : "Événements de démonstration : "}3,{" "}
          {english ? "canonical tier 0, prototype label" : "niveau canonique 0, étiquette de prototype"} PROTOTYPE-UNVERIFIED,{" "}
          {english ? "hand-entered demonstration data" : "données de démonstration saisies à la main"}
        </li>
        <li>
          {english
            ? "Place, washroom, parking, and journey seeds: 0 in this repository."
            : "Graines de lieux, de toilettes, de stationnement et de trajets : 0 dans ce dépôt."}
        </li>
      </ul>
      <h2>{english ? "Record labels" : "Étiquettes des fiches"}</h2>
      <p>
        {english
          ? "No record in this prototype is VERIFIED. VERIFIED would need evidence this build does not create. Unknown stays Unknown."
          : "Aucune fiche de ce prototype n'est VERIFIED. VERIFIED exigerait une preuve que cette version ne crée pas. Inconnu reste Inconnu."}
      </p>
      <h2>{english ? "Sources" : "Sources"}</h2>
      <ul>
        <li>{english ? "Master plan, read 13 November 2026. It is a proposal, not a partner statement." : "Plan directeur, lu le 13 novembre 2026. C'est une proposition, pas une déclaration d'un partenaire."}</li>
        <li>
          <a href="https://988.ca/">9-8-8</a> {english ? "retrieved 13 November 2026." : "consulté le 13 novembre 2026."}
        </li>
        <li>
          <a href="https://health811.ontario.ca/static/guest/contact-us">Health811</a>{" "}
          {english ? "retrieved 13 November 2026." : "consulté le 13 novembre 2026."}
        </li>
        <li>
          <a href="https://connexontario.ca/contact-us/">ConnexOntario</a>{" "}
          {english ? "retrieved 13 November 2026." : "consulté le 13 novembre 2026."}
        </li>
        <li>
          {" "}
          {english
            ? "The App is independent and is not affiliated with any organisation. No organisation has endorsed the App."
            : "L'application est indépendante et elle n'est pas affiliée à une organisation. Aucune organisation n'a approuvé l'application."}
        </li>
      </ul>
      <p>
        {english
          ? "The App does not give medical advice, legal advice, or a benefits decision."
          : "L'application ne donne pas de conseil médical, d'avis juridique, ni de décision de prestation."}
      </p>
      <p>
        <Link to="/demo-record">
          {english ? "Demo-day record on this device (Sample data)" : "Registre de la journée de démonstration sur cet appareil (Données d’exemple)"}
        </Link>
      </p>
      <p>
        {english ? "Help pack saved at: " : "Paquet d'aide enregistré le : "}{packSavedAt ?? (english ? "not yet" : "pas encore")}
      </p>
    </article>
  );
}

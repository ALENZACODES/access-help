import { createRoot } from "react-dom/client";
import { ConnectionRequestStore } from "../src/connect/store.js";
import { SAMPLE_ROUTING_TABLE } from "../src/testing/routing-fixture.js";
import { PeerRequestFlow } from "../src/ui/index.js";
import "../src/ui/peers.css";

const params = new URLSearchParams(window.location.search);
const language = params.get("lang") === "fr" ? "fr" : "en";
document.documentElement.lang = language;

const root = document.getElementById("root");
if (root) {
  // "table=sample" loads made-up streams, labelled as sample data, to exercise the rules.
  const table = params.get("table") === "sample" ? SAMPLE_ROUTING_TABLE : undefined;
  createRoot(root).render(
    <PeerRequestFlow language={language} store={new ConnectionRequestStore(window.localStorage)} table={table} />,
  );
}

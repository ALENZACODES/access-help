import { useMemo } from "react";
import { ConnectionRequestStore } from "@access/peers";
import { PeerRequestFlow } from "@access/peers/ui";
import "@access/peers/ui/peers.css";

type Language = "en" | "fr";
type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * The peer-connection request, at /peers/request. The person prepares a summary on this
 * device and shares it themselves. Nothing is sent, and there is no messaging and no
 * pairing with another person. The history is kept in this browser's storage.
 */
export function PeerRequestPage({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const store = useMemo(() => new ConnectionRequestStore(storage), [storage]);
  return <PeerRequestFlow language={language} store={store} />;
}

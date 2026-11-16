import { emptyForm, type FormValues } from "./form";
import type { Place } from "./places";

/**
 * Starts the "add a note" form for a place that is already on this device.
 * The name and address are filled in; every detail stays Unknown and there is
 * no default licence, so a person has to choose what to record.
 */
export function formForPlace(place: Pick<Place, "name" | "address">, today: Date): FormValues {
  return { ...emptyForm(today), placeName: place.name, address: place.address ?? "" };
}

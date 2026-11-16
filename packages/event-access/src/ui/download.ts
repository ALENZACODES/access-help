/**
 * Save text as a file on this device through the browser's own download. Nothing is sent anywhere.
 * Returns false when the browser cannot do it.
 */
export function saveTextFile(fileName: string, text: string, type = "application/json"): boolean {
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return false;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

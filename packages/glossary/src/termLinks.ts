/** Where a link to a feature's definition points. The finder and the help page both have an element with this id for each feature. */
export function termHref(id: string): string {
  return `#gl-fd-${id}`;
}

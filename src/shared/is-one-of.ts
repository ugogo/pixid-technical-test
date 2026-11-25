/** Narrows a value to one of a known list, such as an enum read from a URL or a request. */
export function isOneOf<Value extends string | number>(
  values: readonly Value[],
  value: unknown,
): value is Value {
  return values.some((candidate) => candidate === value);
}

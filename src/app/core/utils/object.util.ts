export interface CleanOptions {
  removeNull?: boolean;
  removeUndefined?: boolean;
  removeEmptyString?: boolean;
  removeEmptyArray?: boolean;
}

export function cleanObject<T extends Record<string, any>>(
  obj: T,
  options: CleanOptions = {
    removeNull: true,
    removeUndefined: true,
    removeEmptyString: true,
    removeEmptyArray: true
  }
): Partial<T> {

  const result: Partial<T> = {};

  for (const key in obj) {
    const value = obj[key];

    if (options.removeNull && value === null) continue;
    if (options.removeUndefined && value === undefined) continue;
    if (options.removeEmptyString && typeof value === 'string' && value.trim() === '') continue;
    if (options.removeEmptyArray && Array.isArray(value) && value.length === 0) continue;

    result[key] = value;
  }

  return result;
}

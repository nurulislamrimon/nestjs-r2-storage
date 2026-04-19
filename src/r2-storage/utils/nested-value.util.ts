export interface ParsedPath {
  segments: PathSegment[];
}

export interface PathSegment {
  key: string;
  isArray: boolean;
  arrayIndex?: number;
}

/**
 * Parse path like:
 *  - user.profile.image
 *  - gallery[].photo
 *  - variants[0].images[].url
 */
export function parseFieldPath(path: string): ParsedPath {
  const segments: PathSegment[] = [];
  const parts = path.split(".");

  for (const part of parts) {
    const match = part.match(/^([^\[\]]+)(?:\[(\d*)\])?$/);
    if (!match) continue;

    const key = match[1];
    const indexRaw = match[2];

    const hasIndex = indexRaw !== undefined && indexRaw !== "";
    const hasEmptyBrackets = indexRaw === "";

    segments.push({
      key,
      isArray: hasIndex || hasEmptyBrackets,
      arrayIndex: hasIndex ? parseInt(indexRaw, 10) : undefined,
    });
  }

  return { segments };
}

/**
 * Get nested value safely
 */
export function getNestedValue<T extends Record<string, any>>(
  obj: T,
  path: string,
): any {
  if (!path || !obj) return undefined;

  const { segments } = parseFieldPath(path);
  let current: any = obj;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (current == null) return undefined;

    // access key first
    current = current[segment.key];

    if (current == null) return undefined;

    if (segment.isArray) {
      if (!Array.isArray(current)) return undefined;

      // indexed array
      if (segment.arrayIndex !== undefined) {
        current = current[segment.arrayIndex];
        continue;
      }

      // [] case
      if (i === segments.length - 1) return current;

      const next = segments[i + 1];

      // return array so caller can map
      if (next && !next.isArray && next.arrayIndex === undefined) {
        return current;
      }
    }
  }

  return current;
}

/**
 * Set nested value safely (immutable)
 */
export function setNestedValue<T extends Record<string, any>>(
  obj: T,
  path: string,
  value: any,
): T {
  if (!path) return obj;

  const { segments } = parseFieldPath(path);
  const result: any = { ...obj };

  let current: any = result;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    // ensure key exists
    if (current[segment.key] == null) {
      current[segment.key] = segment.isArray ? [] : {};
    }

    if (segment.isArray) {
      if (!Array.isArray(current[segment.key])) {
        current[segment.key] = [];
      }

      const arr = current[segment.key];

      // indexed array
      if (segment.arrayIndex !== undefined) {
        if (!arr[segment.arrayIndex]) {
          arr[segment.arrayIndex] = {};
        }

        if (isLast) {
          arr[segment.arrayIndex] = value;
        } else {
          arr[segment.arrayIndex] = { ...arr[segment.arrayIndex] };
          current = arr[segment.arrayIndex];
        }
      } else {
        // [] case
        if (isLast) {
          arr.push(value);
        } else {
          const newItem: any = {};
          arr.push(newItem);
          current = newItem;
        }
      }
    } else {
      if (isLast) {
        current[segment.key] = value;
      } else {
        current[segment.key] = { ...current[segment.key] };
        current = current[segment.key];
      }
    }
  }

  return result;
}

/**
 * Collect values (handles array returns)
 */
export function collectNestedValues<T extends Record<string, any>>(
  obj: T,
  path: string,
): any[] {
  const value = getNestedValue(obj, path);

  if (value === undefined) return [];
  if (Array.isArray(value)) return value;

  return [value];
}

/**
 * Helpers
 */
export function isArrayPath(path: string): boolean {
  return /\[\]/.test(path);
}

export function getArrayBasePath(path: string): string {
  const match = path.match(/^([^\[]+)/);
  return match ? match[1] : path;
}

export function getArrayElementPath(path: string): string {
  return path.replace("[]", "");
}

export function getAllArrayItemPaths(
  path: string,
  arrayLength: number,
): string[] {
  const basePath = getArrayBasePath(path);
  const elementPath = getArrayElementPath(path);
  const cleanElementPath = elementPath.replace(/^\./, "");

  const paths: string[] = [];

  for (let i = 0; i < arrayLength; i++) {
    paths.push(`${basePath}[${i}].${cleanElementPath}`);
  }

  return paths;
}

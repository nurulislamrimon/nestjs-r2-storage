export interface ParsedPath {
  segments: PathSegment[];
}

export interface PathSegment {
  key: string;
  isArray: boolean;
  arrayIndex?: number;
}

export function parseFieldPath(path: string): ParsedPath {
  const segments: PathSegment[] = [];
  const regex = /(\w+)(?:\[(\d*)\])?/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(path)) !== null) {
    segments.push({
      key: match[1],
      isArray: match[0].includes('['),
      arrayIndex: match[2] !== undefined ? parseInt(match[2], 10) : undefined,
    });
  }

  return { segments };
}

export function getNestedValue<T extends Record<string, any>>(
  obj: T,
  path: string,
): any {
  if (!path || !obj) {
    return undefined;
  }

  const { segments } = parseFieldPath(path);
  let current: any = obj;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (current === null || current === undefined) {
      return undefined;
    }

    if (segment.isArray) {
      if (!Array.isArray(current)) {
        return undefined;
      }

      if (segment.arrayIndex !== undefined) {
        current = current[segment.arrayIndex];
      } else {
        return current;
      }
    } else {
      current = current[segment.key];
    }
  }

  return current;
}

export function setNestedValue<T extends Record<string, any>>(
  obj: T,
  path: string,
  value: any,
): T {
  if (!path) {
    return obj;
  }

  const { segments } = parseFieldPath(path);
  const result = { ...obj };
  let current: any = result;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];

    if (current[segment.key] === undefined) {
      current[segment.key] = nextSegment.isArray ? [] : {};
    } else if (segment.isArray) {
      current[segment.key] = [...current[segment.key]];
    } else {
      current[segment.key] = { ...current[segment.key] };
    }

    current = current[segment.key];

    if (segment.isArray && segment.arrayIndex !== undefined) {
      if (current[segment.arrayIndex] === undefined) {
        current[segment.arrayIndex] = {};
      } else {
        current[segment.arrayIndex] = { ...current[segment.arrayIndex] };
      }
      current = current[segment.arrayIndex];
    }
  }

  const lastSegment = segments[segments.length - 1];

  if (lastSegment.isArray && lastSegment.arrayIndex !== undefined) {
    if (!Array.isArray(current)) {
      current = [];
    } else {
      current = [...current];
    }
    current[lastSegment.arrayIndex] = {
      ...current[lastSegment.arrayIndex],
      [lastSegment.key]: value,
    };
  } else {
    current[lastSegment.key] = value;
  }

  return result;
}

export function collectNestedValues<T extends Record<string, any>>(
  obj: T,
  path: string,
): any[] {
  const value = getNestedValue(obj, path);

  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

export function isArrayPath(path: string): boolean {
  return /\[\]/.test(path);
}

export function getArrayBasePath(path: string): string {
  const match = path.match(/^([^\[]+)/);
  return match ? match[1] : path;
}

export function getArrayElementPath(path: string): string {
  return path.replace('[]', '');
}

export function getAllArrayItemPaths(path: string, arrayLength: number): string[] {
  const basePath = getArrayBasePath(path);
  const elementPath = getArrayElementPath(path);
  const cleanElementPath = elementPath.replace(/^\./, '');

  const paths: string[] = [];
  for (let i = 0; i < arrayLength; i++) {
    paths.push(`${basePath}[${i}].${cleanElementPath}`);
  }

  return paths;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFieldPath = parseFieldPath;
exports.getNestedValue = getNestedValue;
exports.setNestedValue = setNestedValue;
exports.collectNestedValues = collectNestedValues;
exports.isArrayPath = isArrayPath;
exports.getSubPathAfterArray = getSubPathAfterArray;
exports.getAllArrayItemPaths = getAllArrayItemPaths;
function parseFieldPath(path) {
    const segments = [];
    const parts = path.split(".");
    for (const part of parts) {
        const match = part.match(/^([^\[\]]+)(?:\[(\d*)\])?$/);
        if (!match)
            continue;
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
function getNestedValue(obj, path) {
    if (!path || !obj)
        return undefined;
    const { segments } = parseFieldPath(path);
    let current = obj;
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (current == null)
            return undefined;
        current = current[segment.key];
        if (current == null)
            return undefined;
        if (segment.isArray) {
            if (!Array.isArray(current))
                return undefined;
            if (segment.arrayIndex !== undefined) {
                current = current[segment.arrayIndex];
                continue;
            }
            if (i === segments.length - 1)
                return current;
            const next = segments[i + 1];
            if (next && !next.isArray && next.arrayIndex === undefined)
                return current;
        }
    }
    return current;
}
function setNestedValue(obj, path, value) {
    if (!path)
        return obj;
    const { segments } = parseFieldPath(path);
    const result = { ...obj };
    let current = result;
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const isLast = i === segments.length - 1;
        if (current[segment.key] == null) {
            current[segment.key] = segment.isArray ? [] : {};
        }
        if (segment.isArray) {
            if (!Array.isArray(current[segment.key]))
                current[segment.key] = [];
            const arr = current[segment.key];
            if (segment.arrayIndex !== undefined) {
                if (!arr[segment.arrayIndex])
                    arr[segment.arrayIndex] = {};
                if (isLast)
                    arr[segment.arrayIndex] = value;
                else {
                    arr[segment.arrayIndex] = { ...arr[segment.arrayIndex] };
                    current = arr[segment.arrayIndex];
                }
            }
            else {
                if (isLast)
                    arr.push(value);
                else {
                    const newItem = {};
                    arr.push(newItem);
                    current = newItem;
                }
            }
        }
        else {
            if (isLast)
                current[segment.key] = value;
            else {
                current[segment.key] = { ...current[segment.key] };
                current = current[segment.key];
            }
        }
    }
    return result;
}
function collectNestedValues(obj, path) {
    const value = getNestedValue(obj, path);
    if (value === undefined)
        return [];
    if (Array.isArray(value))
        return value;
    return [value];
}
function isArrayPath(path) {
    return /\[\]/.test(path);
}
function getSubPathAfterArray(path) {
    const { segments } = parseFieldPath(path);
    const arrIdx = segments.findIndex((s) => s.isArray);
    if (arrIdx === -1)
        return path;
    return segments.slice(arrIdx + 1).map((s) => s.key).join(".");
}
function getAllArrayItemPaths(path, arrayLength) {
    const { segments } = parseFieldPath(path);
    const arrIdx = segments.findIndex((s) => s.isArray);
    if (arrIdx === -1)
        return [];
    const arraySegment = segments[arrIdx];
    const baseSegments = segments.slice(0, arrIdx);
    const subSegments = segments.slice(arrIdx + 1);
    const paths = [];
    for (let i = 0; i < arrayLength; i++) {
        const pathParts = [
            ...baseSegments.map((s) => s.key),
            `${arraySegment.key}[${i}]`,
            ...subSegments.map((s) => s.key),
        ];
        paths.push(pathParts.filter(Boolean).join("."));
    }
    return paths;
}
//# sourceMappingURL=nested-value.util.js.map
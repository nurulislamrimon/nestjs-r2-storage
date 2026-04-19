"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFieldPath = parseFieldPath;
exports.getNestedValue = getNestedValue;
exports.setNestedValue = setNestedValue;
exports.collectNestedValues = collectNestedValues;
exports.isArrayPath = isArrayPath;
exports.getArrayBasePath = getArrayBasePath;
exports.getArrayElementPath = getArrayElementPath;
exports.getAllArrayItemPaths = getAllArrayItemPaths;
function parseFieldPath(path) {
    const segments = [];
    const regex = /([^\[\].]+)(?:\[(\d*)\])?/g;
    let match;
    while ((match = regex.exec(path)) !== null) {
        segments.push({
            key: match[1],
            isArray: match[0].includes('['),
            arrayIndex: match[2] !== undefined ? parseInt(match[2], 10) : undefined,
        });
    }
    return { segments };
}
function getNestedValue(obj, path) {
    if (!path || !obj) {
        return undefined;
    }
    const { segments } = parseFieldPath(path);
    let current = obj;
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
            }
            else {
                return current;
            }
        }
        else {
            current = current[segment.key];
        }
    }
    return current;
}
function setNestedValue(obj, path, value) {
    if (!path) {
        return obj;
    }
    const { segments } = parseFieldPath(path);
    const result = { ...obj };
    let current = result;
    for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        const nextSegment = segments[i + 1];
        if (current[segment.key] === undefined) {
            current[segment.key] = nextSegment.isArray ? [] : {};
        }
        else if (segment.isArray) {
            current[segment.key] = [...current[segment.key]];
        }
        else {
            current[segment.key] = { ...current[segment.key] };
        }
        current = current[segment.key];
        if (segment.isArray && segment.arrayIndex !== undefined) {
            if (current[segment.arrayIndex] === undefined) {
                current[segment.arrayIndex] = {};
            }
            else {
                current[segment.arrayIndex] = { ...current[segment.arrayIndex] };
            }
            current = current[segment.arrayIndex];
        }
    }
    const lastSegment = segments[segments.length - 1];
    if (lastSegment.isArray && lastSegment.arrayIndex !== undefined) {
        if (!Array.isArray(current)) {
            current = [];
        }
        else {
            current = [...current];
        }
        current[lastSegment.arrayIndex] = {
            ...current[lastSegment.arrayIndex],
            [lastSegment.key]: value,
        };
    }
    else {
        current[lastSegment.key] = value;
    }
    return result;
}
function collectNestedValues(obj, path) {
    const value = getNestedValue(obj, path);
    if (value === undefined) {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }
    return [value];
}
function isArrayPath(path) {
    return /\[\]/.test(path);
}
function getArrayBasePath(path) {
    const match = path.match(/^([^\[]+)/);
    return match ? match[1] : path;
}
function getArrayElementPath(path) {
    return path.replace('[]', '');
}
function getAllArrayItemPaths(path, arrayLength) {
    const basePath = getArrayBasePath(path);
    const elementPath = getArrayElementPath(path);
    const cleanElementPath = elementPath.replace(/^\./, '');
    const paths = [];
    for (let i = 0; i < arrayLength; i++) {
        paths.push(`${basePath}[${i}].${cleanElementPath}`);
    }
    return paths;
}
//# sourceMappingURL=nested-value.util.js.map
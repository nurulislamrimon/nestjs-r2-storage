export interface ParsedPath {
    segments: PathSegment[];
}
export interface PathSegment {
    key: string;
    isArray: boolean;
    arrayIndex?: number;
}
export declare function parseFieldPath(path: string): ParsedPath;
export declare function getNestedValue<T extends Record<string, any>>(obj: T, path: string): any;
export declare function setNestedValue<T extends Record<string, any>>(obj: T, path: string, value: any): T;
export declare function collectNestedValues<T extends Record<string, any>>(obj: T, path: string): any[];
export declare function isArrayPath(path: string): boolean;
export declare function getArrayBasePath(path: string): string;
export declare function getArrayElementPath(path: string): string;
export declare function getAllArrayItemPaths(path: string, arrayLength: number): string[];

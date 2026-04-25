export interface PhotoField {
    field: string;
    urlField?: string;
    sizeField?: string;
}
export interface PhotoUploadRequest {
    field: string;
    filename: string;
    size: number;
    prefix?: string;
}
export interface PhotoUploadResponse {
    field: string;
    fileKey: string;
    uploadUrl: string;
    publicUrl: string | null;
    filename?: string;
}
export interface CreatePhotosResult<T extends Record<string, any>> {
    updatedPayload: T;
    uploadUrls: PhotoUploadResponse[];
    totalStorageUsed: number;
}
export interface UpdatePhotosResult<T extends Record<string, any>> {
    updatedPayload: T;
    uploadUrls: PhotoUploadResponse[];
    storageIncrease: number;
    storageDecrease: number;
    deletedFiles: string[];
}
export interface DeletePhotosResult {
    deletedFiles: string[];
    totalStorageFreed: number;
}
export interface AppendUrlsOptions {
    urlField?: (field: string) => string;
}

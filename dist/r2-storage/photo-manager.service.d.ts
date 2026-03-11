import { CloudflareService } from "./cloudflare.service";
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
    publicUrl?: string;
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
export declare class PhotoManagerService {
    private readonly cloudflareService;
    constructor(cloudflareService: CloudflareService);
    appendPhotoUrls<T extends Record<string, any>>(payload: T[], photoFields: PhotoField[]): Promise<T[]>;
    private handleSingleFieldUrl;
    private handleArrayFieldUrls;
    createObjectWithPhotos<T extends Record<string, any>>(payload: T, photoFields: PhotoField[], filePrefix?: string): Promise<CreatePhotosResult<T>>;
    updateObjectWithPhotos<T extends Record<string, any>>(payload: T, existingObject: T, photoFields: PhotoField[], filePrefix?: string): Promise<UpdatePhotosResult<T>>;
    deletePhotosFromObject<T extends Record<string, any>>(object: T, photoFields: PhotoField[]): Promise<DeletePhotosResult>;
    private extractPhotoUploadRequests;
    private extractArrayFieldUploadRequests;
    private extractExistingFiles;
    private determineFilesToDelete;
    private normalizeFilename;
    private updateArrayFieldWithNewFileKey;
}

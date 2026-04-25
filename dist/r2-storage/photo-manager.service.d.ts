import { CloudflareService } from "./cloudflare.service";
import { CreatePhotosResult, DeletePhotosResult, PhotoField, UpdatePhotosResult } from "./interfaces/photo-manager.interface";
export declare class PhotoManagerService {
    private readonly cloudflareService;
    constructor(cloudflareService: CloudflareService);
    appendPhotoUrls<T extends Record<string, any>>(payload: T, photoFields: PhotoField[]): Promise<T>;
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

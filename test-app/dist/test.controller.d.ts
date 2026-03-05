import { PhotoManagerService, CloudflareService } from 'nestjs-r2-storage';
export declare class TestController {
    private readonly photoManager;
    private readonly cloudflare;
    constructor(photoManager: PhotoManagerService, cloudflare: CloudflareService);
    health(): {
        status: string;
        service: string;
    };
    create(body: any): Promise<import("nestjs-r2-storage").CreatePhotosResult<any>>;
    update(body: {
        payload: any;
        existing: any;
    }): Promise<import("nestjs-r2-storage").UpdatePhotosResult<any>>;
    delete(body: any): Promise<import("nestjs-r2-storage").DeletePhotosResult>;
    appendUrls(body: any): Promise<any>;
    getUploadUrl(filename: string, size: string): Promise<import("nestjs-r2-storage").UploadUrlResult>;
    getDownloadUrl(key: string): Promise<import("nestjs-r2-storage").DownloadUrlResult>;
    deleteFile(key: string): Promise<{
        success: boolean;
        key: string;
    }>;
}

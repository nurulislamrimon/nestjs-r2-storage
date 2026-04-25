import { OnModuleInit, OnModuleDestroy, BadRequestException } from "@nestjs/common";
import { StorageOptions } from "./interfaces/storage-options.interface";
import { DownloadUrlResult, FileInfo, UploadUrlResult } from "./interfaces/cloudflare-service.interface";
export declare class AccessModeError extends BadRequestException {
    constructor(message: string);
}
export declare class CloudflareService implements OnModuleInit, OnModuleDestroy {
    private readonly storageOptions;
    private s3Client;
    private options;
    private readonly defaultExpiry;
    private readonly defaultAccessMode;
    constructor(storageOptions: StorageOptions);
    private get accessMode();
    private isPublicAccessAllowed;
    onModuleInit(): void;
    onModuleDestroy(): void;
    private initializeClient;
    getOptions(): StorageOptions;
    private sanitizeFilename;
    private detectMimeType;
    getUploadUrl(fileKey: string, fileSize: number, customFilename?: string, contentType?: string): Promise<UploadUrlResult>;
    getDownloadUrl(fileKey: string): Promise<DownloadUrlResult>;
    deleteFile(fileKey: string): Promise<boolean>;
    deleteFiles(fileKeys: string[]): Promise<{
        success: string[];
        failed: string[];
    }>;
    getFileInfo(fileKey: string): Promise<FileInfo | null>;
    fileExists(fileKey: string): Promise<boolean>;
    generateFileKey(prefix: string, filename: string): string;
}

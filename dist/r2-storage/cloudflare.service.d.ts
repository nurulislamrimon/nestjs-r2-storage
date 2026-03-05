import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { StorageOptions } from './interfaces/storage-options.interface';
export interface UploadUrlResult {
    uploadUrl: string;
    fileKey: string;
    publicUrl?: string;
    mimeType: string;
}
export interface DownloadUrlResult {
    downloadUrl: string;
    publicUrl?: string;
}
export interface FileInfo {
    size: number;
    lastModified?: Date;
    contentType?: string;
}
export declare class CloudflareService implements OnModuleInit, OnModuleDestroy {
    private readonly storageOptions;
    private s3Client;
    private options;
    private readonly defaultExpiry;
    constructor(storageOptions: StorageOptions);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private initializeClient;
    setOptions(options: StorageOptions): void;
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

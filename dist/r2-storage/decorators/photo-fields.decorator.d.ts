export interface PhotoFieldsContext {
    photoFields: Array<{
        field: string;
        urlField?: string;
        sizeField?: string;
    }>;
}
export declare const PhotoFields: (...dataOrPipes: (PhotoFieldsContext | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>>)[]) => ParameterDecorator;
export interface UploadUrlsContext {
    uploadUrls: Array<{
        field: string;
        fileKey: string;
        uploadUrl: string;
        publicUrl?: string;
    }>;
}
export declare const UploadUrls: (...dataOrPipes: (UploadUrlsContext | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>>)[]) => ParameterDecorator;
export interface StorageContext {
    totalStorageUsed?: number;
    storageIncrease?: number;
    storageDecrease?: number;
    totalStorageFreed?: number;
}
export declare const StorageInfo: (...dataOrPipes: (StorageContext | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>>)[]) => ParameterDecorator;

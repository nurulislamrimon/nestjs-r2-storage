import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface PhotoFieldsContext {
  photoFields: Array<{
    field: string;
    urlField?: string;
    sizeField?: string;
  }>;
}

export const PhotoFields = createParamDecorator(
  (data: PhotoFieldsContext, ctx: ExecutionContext) => {
    return data.photoFields;
  },
);

export interface UploadUrlsContext {
  uploadUrls: Array<{
    field: string;
    fileKey: string;
    uploadUrl: string;
    publicUrl?: string;
  }>;
}

export const UploadUrls = createParamDecorator(
  (data: UploadUrlsContext, ctx: ExecutionContext) => {
    return data.uploadUrls;
  },
);

export interface StorageContext {
  totalStorageUsed?: number;
  storageIncrease?: number;
  storageDecrease?: number;
  totalStorageFreed?: number;
}

export const StorageInfo = createParamDecorator(
  (data: StorageContext, ctx: ExecutionContext) => {
    return data;
  },
);

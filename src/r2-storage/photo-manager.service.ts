import { Injectable } from "@nestjs/common";
import { CloudflareService } from "./cloudflare.service";
import {
  getNestedValue,
  setNestedValue,
  isArrayPath,
  parseFieldPath,
  getAllArrayItemPaths,
} from "./utils/nested-value.util";
import {
  AppendUrlsOptions,
  CreatePhotosResult,
  DeletePhotosResult,
  PhotoField,
  PhotoUploadRequest,
  PhotoUploadResponse,
  UpdatePhotosResult,
} from "./interfaces/photo-manager.interface";

type FileMap = Map<string, string>;

interface PhotoDiffResult {
  fieldPath: string;
  action: "upload" | "keep" | "delete";
}

@Injectable()
export class PhotoManagerService {
  constructor(private readonly cloudflareService: CloudflareService) {}

  async appendPhotoUrls<T extends Record<string, any>>(
    payload: T,
    photoFields: PhotoField[],
  ): Promise<T>;

  async appendPhotoUrls<T extends Record<string, any>>(
    payload: T[],
    photoFields: PhotoField[],
  ): Promise<T[]>;

  async appendPhotoUrls<T extends Record<string, any>>(
    payload: T | T[],
    photoFields: PhotoField[],
    options?: AppendUrlsOptions,
  ): Promise<T | T[]> {
    const isArray = Array.isArray(payload);
    const items = isArray ? payload : [payload];

    const urlFieldFn = options?.urlField || ((field: string) => `${field}_url`);

    const result = await Promise.all(
      items.map(async (item) => {
        let updatedItem = { ...item };

        for (const photoField of photoFields) {
          const fieldValue = getNestedValue(updatedItem, photoField.field);

          if (!fieldValue) {
            continue;
          }

          if (isArrayPath(photoField.field)) {
            updatedItem = await this.handleArrayFieldUrls(
              updatedItem,
              photoField,
              urlFieldFn,
            );
          } else {
            updatedItem = await this.handleSingleFieldUrl(
              updatedItem,
              photoField,
              urlFieldFn,
            );
          }
        }

        return updatedItem;
      }),
    );

    return isArray ? result : result[0];
  }

  private async handleSingleFieldUrl<T extends Record<string, any>>(
    item: T,
    photoField: PhotoField,
    urlFieldFn: (field: string) => string,
  ): Promise<T> {
    const fieldValue = getNestedValue(item, photoField.field);

    if (!fieldValue) {
      return item;
    }

    const urlField = photoField.urlField || urlFieldFn(photoField.field);

    try {
      const { downloadUrl, publicUrl } =
        await this.cloudflareService.getDownloadUrl(fieldValue);
      const finalUrl = publicUrl || downloadUrl;
      return setNestedValue(item, urlField, finalUrl);
    } catch (error) {
      console.error(
        `Failed to generate download URL for ${fieldValue}:`,
        error,
      );
      return setNestedValue(item, urlField, null);
    }
  }

  private async handleArrayFieldUrls<T extends Record<string, any>>(
    item: T,
    photoField: PhotoField,
    urlFieldFn: (field: string) => string,
  ): Promise<T> {
    const { segments } = parseFieldPath(photoField.field);
    const lastArrayIndex = segments.findIndex((s) => s.isArray);

    if (lastArrayIndex === -1) {
      return item;
    }

    const arrayPath = segments
      .slice(0, lastArrayIndex + 1)
      .map((s) => s.key)
      .join(".");
    const arrayValue = getNestedValue(item, arrayPath);

    if (!arrayValue || !Array.isArray(arrayValue)) {
      return item;
    }

    const urlField = photoField.urlField || urlFieldFn(photoField.field);
    const { key: photoKey } = segments[segments.length - 1];

    const updatedArray = await Promise.all(
      arrayValue.map(async (arrayItem: Record<string, any>) => {
        const photoValue = arrayItem[photoKey];

        if (!photoValue) {
          return { ...arrayItem, [urlField]: null };
        }

        try {
          const { downloadUrl, publicUrl } =
            await this.cloudflareService.getDownloadUrl(photoValue);
          const finalUrl = publicUrl || downloadUrl;
          return { ...arrayItem, [urlField]: finalUrl };
        } catch (error) {
          console.error(
            `Failed to generate download URL for ${photoValue}:`,
            error,
          );
          return { ...arrayItem, [urlField]: null };
        }
      }),
    );

    return setNestedValue(item, arrayPath, updatedArray);
  }

  async createObjectWithPhotos<T extends Record<string, any>>(
    payload: T,
    photoFields: PhotoField[],
    filePrefix: string = "uploads",
  ): Promise<CreatePhotosResult<T>> {
    let updatedPayload = { ...payload };
    const uploadUrls: PhotoUploadResponse[] = [];
    let totalStorageUsed = 0;

    const photoUploadRequests = this.extractPhotoUploadRequests(
      payload,
      photoFields,
      filePrefix,
    );

    const uploadResults = await Promise.all(
      photoUploadRequests.map(async (request) => {
        const result = await this.cloudflareService.getUploadUrl(
          request.filename,
          request.size,
          request.filename,
        );

        const storageUsed = request.size || 0;
        totalStorageUsed += storageUsed;

        return {
          request,
          response: result,
          storageUsed,
        };
      }),
    );

    for (const { request, response } of uploadResults) {
      uploadUrls.push({
        field: request.field,
        fileKey: response.fileKey,
        uploadUrl: response.uploadUrl,
        publicUrl: response.publicUrl,
        filename: request.filename,
      });

      if (isArrayPath(request.field)) {
        updatedPayload = this.updateFieldWithFileKey(
          updatedPayload,
          request.field,
          response.fileKey,
        );
      } else {
        updatedPayload = setNestedValue(
          updatedPayload,
          request.field,
          response.fileKey,
        );
      }
    }

    return {
      updatedPayload,
      uploadUrls,
      totalStorageUsed,
    };
  }

  async updateObjectWithPhotos<T extends Record<string, any>>(
    payload: T,
    existingObject: T,
    photoFields: PhotoField[],
    filePrefix: string = "uploads",
  ): Promise<UpdatePhotosResult<T>> {
    let updatedPayload = { ...payload };
    const uploadUrls: PhotoUploadResponse[] = [];
    let storageIncrease = 0;
    let storageDecrease = 0;
    const deletedFiles: string[] = [];

    const existingFileMap = this.extractExistingFileMap(
      existingObject,
      photoFields,
    );
    const payloadFileMap = this.extractPayloadFileMap(payload, photoFields);

    const { toUpload, toDelete } = this.calculatePhotoDiffs(
      existingFileMap,
      payloadFileMap,
    );

    if (toDelete.length > 0) {
      const deleteResults = await this.cloudflareService.deleteFiles(toDelete);
      deletedFiles.push(...deleteResults.success);

      for (const fileKey of deleteResults.success) {
        const fileInfo = await this.cloudflareService.getFileInfo(fileKey);
        if (fileInfo) {
          storageDecrease += fileInfo.size;
        }
      }
    }

    const uploadRequests: PhotoUploadRequest[] = [];
    for (const { fieldPath } of toUpload) {
      const filename = getNestedValue(payload, fieldPath) || fieldPath;
      const size = this.getSizeForField(payload, photoFields, fieldPath);
      uploadRequests.push({
        field: fieldPath,
        filename: filename,
        size,
        prefix: filePrefix,
      });
    }

    const uploadResults = await Promise.all(
      uploadRequests.map(async (request) => {
        const response = await this.cloudflareService.getUploadUrl(
          request.filename,
          request.size,
          request.filename,
        );

        const storageUsed = request.size || 0;
        storageIncrease += storageUsed;

        return { request, response };
      }),
    );

    for (const { request, response } of uploadResults) {
      uploadUrls.push({
        field: request.field,
        fileKey: response.fileKey,
        uploadUrl: response.uploadUrl,
        publicUrl: response.publicUrl,
        filename: request.filename,
      });

      updatedPayload = this.updateFieldWithFileKey(
        updatedPayload,
        request.field,
        response.fileKey,
      );
    }

    return {
      updatedPayload,
      uploadUrls,
      storageIncrease,
      storageDecrease,
      deletedFiles,
    };
  }

  async deletePhotosFromObject<T extends Record<string, any>>(
    object: T,
    photoFields: PhotoField[],
  ): Promise<DeletePhotosResult> {
    const fileKeys = this.extractExistingFiles(object, photoFields);
    const deletedFiles: string[] = [];
    let totalStorageFreed = 0;

    if (fileKeys.length === 0) {
      return { deletedFiles: [], totalStorageFreed: 0 };
    }

    const results = await this.cloudflareService.deleteFiles(fileKeys);
    deletedFiles.push(...results.success);

    for (const fileKey of results.success) {
      const fileInfo = await this.cloudflareService.getFileInfo(fileKey);
      if (fileInfo) {
        totalStorageFreed += fileInfo.size;
      }
    }

    return {
      deletedFiles,
      totalStorageFreed,
    };
  }

  extractExistingFileMap<T extends Record<string, any>>(
    object: T,
    photoFields: PhotoField[],
  ): FileMap {
    const map: FileMap = new Map();

    for (const photoField of photoFields) {
      const fieldValue = getNestedValue(object, photoField.field);

      if (!fieldValue) {
        continue;
      }

      if (isArrayPath(photoField.field)) {
        const arrayFieldPaths = this.getArrayFieldPaths(
          object,
          photoField.field,
        );
        for (const fieldPath of arrayFieldPaths) {
          const value = getNestedValue(object, fieldPath);
          if (value && typeof value === "string" && value.length > 0) {
            map.set(fieldPath, value);
          }
        }
      } else {
        if (typeof fieldValue === "string" && fieldValue.length > 0) {
          map.set(photoField.field, fieldValue);
        }
      }
    }

    return map;
  }

  private extractPayloadFileMap<T extends Record<string, any>>(
    payload: T,
    photoFields: PhotoField[],
  ): FileMap {
    const map: FileMap = new Map();

    for (const photoField of photoFields) {
      const fieldValue = getNestedValue(payload, photoField.field);

      if (!fieldValue) {
        continue;
      }

      if (isArrayPath(photoField.field)) {
        const arrayFieldPaths = this.getArrayFieldPaths(
          payload,
          photoField.field,
        );
        for (const fieldPath of arrayFieldPaths) {
          const value = getNestedValue(payload, fieldPath);
          if (value && typeof value === "string" && value.length > 0) {
            map.set(fieldPath, value);
          }
        }
      } else {
        if (typeof fieldValue === "string" && fieldValue.length > 0) {
          map.set(photoField.field, fieldValue);
        }
      }
    }

    return map;
  }

  private getArrayFieldPaths<T extends Record<string, any>>(
    object: T,
    fieldPattern: string,
  ): string[] {
    const { segments } = parseFieldPath(fieldPattern);
    const lastArrayIndex = segments.findIndex((s) => s.isArray);

    if (lastArrayIndex === -1) {
      return [];
    }

    const arrayPath = segments
      .slice(0, lastArrayIndex + 1)
      .map((s) => s.key)
      .join(".");
    const arrayValue = getNestedValue(object, arrayPath);

    if (!arrayValue || !Array.isArray(arrayValue)) {
      return [];
    }

    return getAllArrayItemPaths(fieldPattern, arrayValue.length);
  }

  private calculatePhotoDiffs(
    existingMap: FileMap,
    payloadMap: FileMap,
  ): { toUpload: PhotoDiffResult[]; toDelete: string[] } {
    const toUpload: PhotoDiffResult[] = [];
    const toDelete: string[] = [];

    for (const [fieldPath, filename] of payloadMap) {
      const existingValue = existingMap.get(fieldPath);
      if (existingValue && existingValue === filename) {
        continue;
      }
      toUpload.push({ fieldPath, action: "upload" });
    }

    for (const [fieldPath, existingFileKey] of existingMap) {
      const payloadFileKey = payloadMap.get(fieldPath);
      if (!payloadFileKey || payloadFileKey !== existingFileKey) {
        toDelete.push(existingFileKey);
      }
    }

    return { toUpload, toDelete };
  }

  private getSizeForField<T extends Record<string, any>>(
    payload: T,
    photoFields: PhotoField[],
    fieldPath: string,
  ): number {
    for (const photoField of photoFields) {
      if (!photoField.sizeField) {
        continue;
      }

      if (photoField.field === fieldPath) {
        const sizeValue = getNestedValue(payload, photoField.sizeField);
        return typeof sizeValue === "number" ? sizeValue : 0;
      }

      if (isArrayPath(photoField.field)) {
        const arrayFieldPaths = this.getArrayFieldPaths(
          payload,
          photoField.field,
        );
        const index = arrayFieldPaths.indexOf(fieldPath);

        if (index !== -1) {
          const { segments } = parseFieldPath(photoField.field);
          const arrayPath = segments
            .slice(0, segments.findIndex((s) => s.isArray) + 1)
            .map((s) => s.key)
            .join(".");

          const arrayValue = getNestedValue(payload, arrayPath);
          if (arrayValue && arrayValue[index]) {
            const sizeKey = photoField.sizeField.split(".").pop();
            if (sizeKey) {
              const sizeValue = arrayValue[index][sizeKey];
              return typeof sizeValue === "number" ? sizeValue : 0;
            }
          }
        }
      }
    }

    return 0;
  }

  private updateFieldWithFileKey<T extends Record<string, any>>(
    payload: T,
    fieldPath: string,
    fileKey: string,
  ): T {
    return setNestedValue(payload, fieldPath, fileKey);
  }

  private extractPhotoUploadRequests<T extends Record<string, any>>(
    payload: T,
    photoFields: PhotoField[],
    filePrefix: string,
  ): PhotoUploadRequest[] {
    const requests: PhotoUploadRequest[] = [];

    for (const photoField of photoFields) {
      const fieldValue = getNestedValue(payload, photoField.field);

      if (!fieldValue) {
        continue;
      }

      if (isArrayPath(photoField.field)) {
        const arrayFieldPaths = this.getArrayFieldPaths(
          payload,
          photoField.field,
        );
        for (const fieldPath of arrayFieldPaths) {
          const value = getNestedValue(payload, fieldPath);
          if (!value || typeof value !== "string") {
            continue;
          }

          const size = this.getSizeForField(payload, photoFields, fieldPath);

          requests.push({
            field: fieldPath,
            filename: value,
            size,
            prefix: filePrefix,
          });
        }
      } else {
        const sizeValue = photoField.sizeField
          ? getNestedValue(payload, photoField.sizeField)
          : 0;

        if (typeof fieldValue === "string" && fieldValue.length > 0) {
          requests.push({
            field: photoField.field,
            filename: fieldValue,
            size: (sizeValue as number) || 0,
            prefix: filePrefix,
          });
        }
      }
    }

    return requests;
  }

  private extractExistingFiles<T extends Record<string, any>>(
    object: T,
    photoFields: PhotoField[],
  ): string[] {
    const fileKeys: string[] = [];

    for (const photoField of photoFields) {
      const fieldValue = getNestedValue(object, photoField.field);

      if (!fieldValue) {
        continue;
      }

      if (isArrayPath(photoField.field)) {
        const arrayFieldPaths = this.getArrayFieldPaths(
          object,
          photoField.field,
        );
        for (const fieldPath of arrayFieldPaths) {
          const value = getNestedValue(object, fieldPath);
          if (value && typeof value === "string" && value.length > 0) {
            fileKeys.push(value);
          }
        }
      } else if (typeof fieldValue === "string" && fieldValue.length > 0) {
        fileKeys.push(fieldValue);
      }
    }

    return fileKeys;
  }
}

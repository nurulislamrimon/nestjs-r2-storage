import { Injectable } from "@nestjs/common";
import { CloudflareService, DownloadUrlResult } from "./cloudflare.service";
import {
  getNestedValue,
  setNestedValue,
  isArrayPath,
  getArrayBasePath,
  parseFieldPath,
} from "./utils/nested-value.util";

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

@Injectable()
export class PhotoManagerService {
  constructor(private readonly cloudflareService: CloudflareService) {}

  /**
   * Appends signed URLs to response objects based on defined photo fields.
   * Supports nested paths like `shop.logo`, `products[].image`, `gallery[].photo`.
   *
   * For array paths like `gallery[].photo`:
   * - Extracts all photo values from the array
   * - Generates signed URLs for each
   * - Adds them to corresponding array items with the specified urlField
   */
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
    const arrayPath = segments
      .map((s) => (s.isArray ? `${s.key}[]` : s.key))
      .join(".");
    const arrayValue = getNestedValue(item, arrayPath);

    if (!Array.isArray(arrayValue)) {
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

  /**
   * Creates a new object with photo upload URLs for all defined photo fields.
   * Supports nested paths and array paths.
   *
   * Input example:
   * {
   *   name: "Laptop",
   *   image: "laptop.png",
   *   image_size: 42000,
   *   gallery: [{ photo: "photo1.jpg", photo_size: 1000 }]
   * }
   *
   * Output:
   * {
   *   updatedPayload: { name: "Laptop", image: "generated-key.png", gallery: [...] },
   *   uploadUrls: [{ field: "image", fileKey: "...", uploadUrl: "..." }],
   *   totalStorageUsed: 43000
   * }
   */
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

    for (const { request, response, storageUsed } of uploadResults) {
      uploadUrls.push({
        field: request.field,
        fileKey: response.fileKey,
        uploadUrl: response.uploadUrl,
        publicUrl: response.publicUrl,
        filename: request.filename,
      });

      if (isArrayPath(request.field)) {
        updatedPayload = await this.updateArrayFieldWithNewFileKey(
          updatedPayload,
          request.field,
          request.filename,
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

  /**
   * Updates an existing object with new photos while managing old files.
   * Handles:
   * - Replacing existing images
   * - Deleting old files
   * - Calculating storage changes
   *
   * Input: payload with new photo data, existingObject with old photo data
   */
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

    const existingFiles = this.extractExistingFiles(
      existingObject,
      photoFields,
    );
    const newPhotoRequests = this.extractPhotoUploadRequests(
      payload,
      photoFields,
      filePrefix,
    );

    const filesToDelete = this.determineFilesToDelete(
      existingFiles,
      newPhotoRequests,
    );

    if (filesToDelete.length > 0) {
      const deleteResults =
        await this.cloudflareService.deleteFiles(filesToDelete);
      deletedFiles.push(...deleteResults.success);

      for (const fileKey of deleteResults.success) {
        const fileInfo = await this.cloudflareService.getFileInfo(fileKey);
        if (fileInfo) {
          storageDecrease += fileInfo.size;
        }
      }
    }

    const uploadResults = await Promise.all(
      newPhotoRequests.map(async (request) => {
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

      if (isArrayPath(request.field)) {
        updatedPayload = await this.updateArrayFieldWithNewFileKey(
          updatedPayload,
          request.field,
          request.filename,
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
      storageIncrease,
      storageDecrease,
      deletedFiles,
    };
  }

  /**
   * Deletes all photo files associated with an object.
   * Supports nested paths and array paths.
   * Returns total storage freed.
   */
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

  /**
   * Extracts photo upload requests from payload based on defined photo fields.
   * Handles both simple fields and array fields.
   */
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
        const arrayRequests = this.extractArrayFieldUploadRequests(
          payload,
          photoField,
          filePrefix,
        );
        requests.push(...arrayRequests);
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

  private extractArrayFieldUploadRequests<T extends Record<string, any>>(
    payload: T,
    photoField: PhotoField,
    filePrefix: string,
  ): PhotoUploadRequest[] {
    const requests: PhotoUploadRequest[] = [];
    const { segments } = parseFieldPath(photoField.field);

    const arrayPath = segments
      .map((s) => (s.isArray ? `${s.key}[]` : s.key))
      .join(".");
    const arrayValue = getNestedValue(payload, arrayPath);

    if (!Array.isArray(arrayValue)) {
      return requests;
    }

    const { key: photoKey } = segments[segments.length - 1];
    const sizeKey = photoField.sizeField
      ? photoField.sizeField.split(".").pop()
      : null;

    for (let i = 0; i < arrayValue.length; i++) {
      const item = arrayValue[i];
      const photoValue = item[photoKey];

      if (!photoValue || typeof photoValue !== "string") {
        continue;
      }

      const sizeValue = sizeKey ? (item[sizeKey] as number) || 0 : 0;
      const fieldPath = `${arrayPath}[${i}].${photoKey}`;

      requests.push({
        field: fieldPath,
        filename: photoValue,
        size: sizeValue,
        prefix: filePrefix,
      });
    }

    return requests;
  }

  /**
   * Extracts existing file keys from an object based on defined photo fields.
   */
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
        const { segments } = parseFieldPath(photoField.field);
        const arrayPath = segments
          .map((s) => (s.isArray ? `${s.key}[]` : s.key))
          .join(".");
        const arrayValue = getNestedValue(object, arrayPath);

        if (Array.isArray(arrayValue)) {
          const { key } = segments[segments.length - 1];
          for (const item of arrayValue) {
            if (item[key] && typeof item[key] === "string") {
              fileKeys.push(item[key]);
            }
          }
        }
      } else if (typeof fieldValue === "string" && fieldValue.length > 0) {
        fileKeys.push(fieldValue);
      }
    }

    return fileKeys;
  }

  /**
   * Determines which files should be deleted when updating.
   * Compares existing files with new photo requests.
   */
  private determineFilesToDelete(
    existingFiles: string[],
    newRequests: PhotoUploadRequest[],
  ): string[] {
    const newFilenames = new Set(
      newRequests.map((r) => this.normalizeFilename(r.filename)),
    );

    return existingFiles.filter(
      (file) => !newFilenames.has(this.normalizeFilename(file)),
    );
  }

  private normalizeFilename(filename: string): string {
    return filename.split("/").pop() || filename;
  }

  /**
   * Updates an array field with a new file key.
   * This handles the case where a new file replaces an existing one in an array.
   */
  private async updateArrayFieldWithNewFileKey<T extends Record<string, any>>(
    payload: T,
    fieldPath: string,
    oldFilename: string,
    newFileKey: string,
  ): Promise<T> {
    const { segments } = parseFieldPath(fieldPath);
    const arrayPath = segments
      .slice(0, -1)
      .map((s) => (s.isArray ? `${s.key}[]` : s.key))
      .join(".");
    const { key: photoKey } = segments[segments.length - 1];

    const arrayValue = getNestedValue(payload, arrayPath);

    if (!Array.isArray(arrayValue)) {
      return payload;
    }

    const oldNormalized = this.normalizeFilename(oldFilename);

    const updatedArray = arrayValue.map((item: Record<string, any>) => {
      const itemPhotoValue = item[photoKey];
      if (!itemPhotoValue) {
        return item;
      }

      const itemNormalized = this.normalizeFilename(itemPhotoValue);

      if (itemNormalized === oldNormalized) {
        return { ...item, [photoKey]: newFileKey };
      }

      return item;
    });

    return setNestedValue(payload, arrayPath, updatedArray);
  }
}

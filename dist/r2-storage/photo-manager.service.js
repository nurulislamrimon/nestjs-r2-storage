"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoManagerService = void 0;
const common_1 = require("@nestjs/common");
const cloudflare_service_1 = require("./cloudflare.service");
const nested_value_util_1 = require("./utils/nested-value.util");
let PhotoManagerService = class PhotoManagerService {
    constructor(cloudflareService) {
        this.cloudflareService = cloudflareService;
    }
    async appendPhotoUrls(payload, photoFields, options) {
        const isArray = Array.isArray(payload);
        const items = isArray ? payload : [payload];
        const urlFieldFn = options?.urlField || ((field) => `${field}_url`);
        const result = await Promise.all(items.map(async (item) => {
            let updatedItem = { ...item };
            for (const photoField of photoFields) {
                const fieldValue = (0, nested_value_util_1.getNestedValue)(updatedItem, photoField.field);
                if (!fieldValue) {
                    continue;
                }
                if ((0, nested_value_util_1.isArrayPath)(photoField.field)) {
                    updatedItem = await this.handleArrayFieldUrls(updatedItem, photoField, urlFieldFn);
                }
                else {
                    updatedItem = await this.handleSingleFieldUrl(updatedItem, photoField, urlFieldFn);
                }
            }
            return updatedItem;
        }));
        return isArray ? result : result[0];
    }
    async handleSingleFieldUrl(item, photoField, urlFieldFn) {
        const fieldValue = (0, nested_value_util_1.getNestedValue)(item, photoField.field);
        if (!fieldValue) {
            return item;
        }
        const urlField = photoField.urlField || urlFieldFn(photoField.field);
        try {
            const { downloadUrl, publicUrl } = await this.cloudflareService.getDownloadUrl(fieldValue);
            const finalUrl = publicUrl || downloadUrl;
            return (0, nested_value_util_1.setNestedValue)(item, urlField, finalUrl);
        }
        catch (error) {
            console.error(`Failed to generate download URL for ${fieldValue}:`, error);
            return (0, nested_value_util_1.setNestedValue)(item, urlField, null);
        }
    }
    async handleArrayFieldUrls(item, photoField, urlFieldFn) {
        const { segments } = (0, nested_value_util_1.parseFieldPath)(photoField.field);
        const lastArrayIndex = segments.findIndex((s) => s.isArray);
        if (lastArrayIndex === -1) {
            return item;
        }
        const arrayPath = segments
            .slice(0, lastArrayIndex + 1)
            .map((s) => s.key)
            .join(".");
        const arrayValue = (0, nested_value_util_1.getNestedValue)(item, arrayPath);
        if (!arrayValue || !Array.isArray(arrayValue)) {
            return item;
        }
        const urlField = photoField.urlField || urlFieldFn(photoField.field);
        const { key: photoKey } = segments[segments.length - 1];
        const updatedArray = await Promise.all(arrayValue.map(async (arrayItem) => {
            const photoValue = arrayItem[photoKey];
            if (!photoValue) {
                return { ...arrayItem, [urlField]: null };
            }
            try {
                const { downloadUrl, publicUrl } = await this.cloudflareService.getDownloadUrl(photoValue);
                const finalUrl = publicUrl || downloadUrl;
                return { ...arrayItem, [urlField]: finalUrl };
            }
            catch (error) {
                console.error(`Failed to generate download URL for ${photoValue}:`, error);
                return { ...arrayItem, [urlField]: null };
            }
        }));
        return (0, nested_value_util_1.setNestedValue)(item, arrayPath, updatedArray);
    }
    async createObjectWithPhotos(payload, photoFields, filePrefix = "uploads") {
        let updatedPayload = { ...payload };
        const uploadUrls = [];
        let totalStorageUsed = 0;
        const photoUploadRequests = this.extractPhotoUploadRequests(payload, photoFields, filePrefix);
        const uploadResults = await Promise.all(photoUploadRequests.map(async (request) => {
            const result = await this.cloudflareService.getUploadUrl(request.filename, request.size, request.filename);
            const storageUsed = request.size || 0;
            totalStorageUsed += storageUsed;
            return {
                request,
                response: result,
                storageUsed,
            };
        }));
        for (const { request, response } of uploadResults) {
            uploadUrls.push({
                field: request.field,
                fileKey: response.fileKey,
                uploadUrl: response.uploadUrl,
                publicUrl: response.publicUrl,
                filename: request.filename,
            });
            if ((0, nested_value_util_1.isArrayPath)(request.field)) {
                updatedPayload = this.updateFieldWithFileKey(updatedPayload, request.field, response.fileKey);
            }
            else {
                updatedPayload = (0, nested_value_util_1.setNestedValue)(updatedPayload, request.field, response.fileKey);
            }
        }
        return {
            updatedPayload,
            uploadUrls,
            totalStorageUsed,
        };
    }
    async updateObjectWithPhotos(payload, existingObject, photoFields, filePrefix = "uploads") {
        let updatedPayload = { ...payload };
        const uploadUrls = [];
        let storageIncrease = 0;
        let storageDecrease = 0;
        const deletedFiles = [];
        const existingFileMap = this.extractExistingFileMap(existingObject, photoFields);
        const payloadFileMap = this.extractPayloadFileMap(payload, photoFields);
        const { toUpload, toDelete } = this.calculatePhotoDiffs(existingFileMap, payloadFileMap);
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
        const uploadRequests = [];
        for (const { fieldPath } of toUpload) {
            const filename = (0, nested_value_util_1.getNestedValue)(payload, fieldPath) || fieldPath;
            const size = this.getSizeForField(payload, photoFields, fieldPath);
            uploadRequests.push({
                field: fieldPath,
                filename: filename,
                size,
                prefix: filePrefix,
            });
        }
        const uploadResults = await Promise.all(uploadRequests.map(async (request) => {
            const response = await this.cloudflareService.getUploadUrl(request.filename, request.size, request.filename);
            const storageUsed = request.size || 0;
            storageIncrease += storageUsed;
            return { request, response };
        }));
        for (const { request, response } of uploadResults) {
            uploadUrls.push({
                field: request.field,
                fileKey: response.fileKey,
                uploadUrl: response.uploadUrl,
                publicUrl: response.publicUrl,
                filename: request.filename,
            });
            updatedPayload = this.updateFieldWithFileKey(updatedPayload, request.field, response.fileKey);
        }
        return {
            updatedPayload,
            uploadUrls,
            storageIncrease,
            storageDecrease,
            deletedFiles,
        };
    }
    async deletePhotosFromObject(object, photoFields) {
        const fileKeys = this.extractExistingFiles(object, photoFields);
        const deletedFiles = [];
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
    extractExistingFileMap(object, photoFields) {
        const map = new Map();
        for (const photoField of photoFields) {
            const fieldValue = (0, nested_value_util_1.getNestedValue)(object, photoField.field);
            if (!fieldValue) {
                continue;
            }
            if ((0, nested_value_util_1.isArrayPath)(photoField.field)) {
                const arrayFieldPaths = this.getArrayFieldPaths(object, photoField.field);
                for (const fieldPath of arrayFieldPaths) {
                    const value = (0, nested_value_util_1.getNestedValue)(object, fieldPath);
                    if (value && typeof value === "string" && value.length > 0) {
                        map.set(fieldPath, value);
                    }
                }
            }
            else {
                if (typeof fieldValue === "string" && fieldValue.length > 0) {
                    map.set(photoField.field, fieldValue);
                }
            }
        }
        return map;
    }
    extractPayloadFileMap(payload, photoFields) {
        const map = new Map();
        for (const photoField of photoFields) {
            const fieldValue = (0, nested_value_util_1.getNestedValue)(payload, photoField.field);
            if (!fieldValue) {
                continue;
            }
            if ((0, nested_value_util_1.isArrayPath)(photoField.field)) {
                const arrayFieldPaths = this.getArrayFieldPaths(payload, photoField.field);
                for (const fieldPath of arrayFieldPaths) {
                    const value = (0, nested_value_util_1.getNestedValue)(payload, fieldPath);
                    if (value && typeof value === "string" && value.length > 0) {
                        map.set(fieldPath, value);
                    }
                }
            }
            else {
                if (typeof fieldValue === "string" && fieldValue.length > 0) {
                    map.set(photoField.field, fieldValue);
                }
            }
        }
        return map;
    }
    getArrayFieldPaths(object, fieldPattern) {
        const { segments } = (0, nested_value_util_1.parseFieldPath)(fieldPattern);
        const lastArrayIndex = segments.findIndex((s) => s.isArray);
        if (lastArrayIndex === -1) {
            return [];
        }
        const arrayPath = segments
            .slice(0, lastArrayIndex + 1)
            .map((s) => s.key)
            .join(".");
        const arrayValue = (0, nested_value_util_1.getNestedValue)(object, arrayPath);
        if (!arrayValue || !Array.isArray(arrayValue)) {
            return [];
        }
        return (0, nested_value_util_1.getAllArrayItemPaths)(fieldPattern, arrayValue.length);
    }
    calculatePhotoDiffs(existingMap, payloadMap) {
        const toUpload = [];
        const toDelete = [];
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
    getSizeForField(payload, photoFields, fieldPath) {
        for (const photoField of photoFields) {
            if (!photoField.sizeField) {
                continue;
            }
            if (photoField.field === fieldPath) {
                const sizeValue = (0, nested_value_util_1.getNestedValue)(payload, photoField.sizeField);
                return typeof sizeValue === "number" ? sizeValue : 0;
            }
            if ((0, nested_value_util_1.isArrayPath)(photoField.field)) {
                const arrayFieldPaths = this.getArrayFieldPaths(payload, photoField.field);
                const index = arrayFieldPaths.indexOf(fieldPath);
                if (index !== -1) {
                    const { segments } = (0, nested_value_util_1.parseFieldPath)(photoField.field);
                    const arrayPath = segments
                        .slice(0, segments.findIndex((s) => s.isArray) + 1)
                        .map((s) => s.key)
                        .join(".");
                    const arrayValue = (0, nested_value_util_1.getNestedValue)(payload, arrayPath);
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
    updateFieldWithFileKey(payload, fieldPath, fileKey) {
        return (0, nested_value_util_1.setNestedValue)(payload, fieldPath, fileKey);
    }
    extractPhotoUploadRequests(payload, photoFields, filePrefix) {
        const requests = [];
        for (const photoField of photoFields) {
            const fieldValue = (0, nested_value_util_1.getNestedValue)(payload, photoField.field);
            if (!fieldValue) {
                continue;
            }
            if ((0, nested_value_util_1.isArrayPath)(photoField.field)) {
                const arrayFieldPaths = this.getArrayFieldPaths(payload, photoField.field);
                for (const fieldPath of arrayFieldPaths) {
                    const value = (0, nested_value_util_1.getNestedValue)(payload, fieldPath);
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
            }
            else {
                const sizeValue = photoField.sizeField
                    ? (0, nested_value_util_1.getNestedValue)(payload, photoField.sizeField)
                    : 0;
                if (typeof fieldValue === "string" && fieldValue.length > 0) {
                    requests.push({
                        field: photoField.field,
                        filename: fieldValue,
                        size: sizeValue || 0,
                        prefix: filePrefix,
                    });
                }
            }
        }
        return requests;
    }
    extractExistingFiles(object, photoFields) {
        const fileKeys = [];
        for (const photoField of photoFields) {
            const fieldValue = (0, nested_value_util_1.getNestedValue)(object, photoField.field);
            if (!fieldValue) {
                continue;
            }
            if ((0, nested_value_util_1.isArrayPath)(photoField.field)) {
                const arrayFieldPaths = this.getArrayFieldPaths(object, photoField.field);
                for (const fieldPath of arrayFieldPaths) {
                    const value = (0, nested_value_util_1.getNestedValue)(object, fieldPath);
                    if (value && typeof value === "string" && value.length > 0) {
                        fileKeys.push(value);
                    }
                }
            }
            else if (typeof fieldValue === "string" && fieldValue.length > 0) {
                fileKeys.push(fieldValue);
            }
        }
        return fileKeys;
    }
};
exports.PhotoManagerService = PhotoManagerService;
exports.PhotoManagerService = PhotoManagerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cloudflare_service_1.CloudflareService])
], PhotoManagerService);
//# sourceMappingURL=photo-manager.service.js.map
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestController = void 0;
const common_1 = require("@nestjs/common");
const nestjs_r2_storage_1 = require("nestjs-r2-storage");
let TestController = class TestController {
    constructor(photoManager, cloudflare) {
        this.photoManager = photoManager;
        this.cloudflare = cloudflare;
    }
    health() {
        return { status: 'ok', service: 'CloudflareService & PhotoManagerService' };
    }
    async create(body) {
        const photoFields = [
            { field: 'avatar', urlField: 'avatar_url', sizeField: 'avatar_size' },
            { field: 'shop.logo', urlField: 'logo_url', sizeField: 'logo_size' },
            { field: 'products[].image', urlField: 'image_url', sizeField: 'image_size' },
            { field: 'gallery[].photo', urlField: 'photo_url', sizeField: 'photo_size' },
        ];
        const result = await this.photoManager.createObjectWithPhotos(body, photoFields);
        return result;
    }
    async update(body) {
        const photoFields = [
            { field: 'avatar', urlField: 'avatar_url', sizeField: 'avatar_size' },
            { field: 'shop.logo', urlField: 'logo_url', sizeField: 'logo_size' },
            { field: 'products[].image', urlField: 'image_url', sizeField: 'image_size' },
            { field: 'gallery[].photo', urlField: 'photo_url', sizeField: 'photo_size' },
        ];
        const result = await this.photoManager.updateObjectWithPhotos(body.payload, body.existing, photoFields);
        return result;
    }
    async delete(body) {
        const photoFields = [
            { field: 'avatar', urlField: 'avatar_url', sizeField: 'avatar_size' },
            { field: 'shop.logo', urlField: 'logo_url', sizeField: 'logo_size' },
            { field: 'products[].image', urlField: 'image_url', sizeField: 'image_size' },
            { field: 'gallery[].photo', urlField: 'photo_url', sizeField: 'photo_size' },
        ];
        const result = await this.photoManager.deletePhotosFromObject(body, photoFields);
        return result;
    }
    async appendUrls(body) {
        const photoFields = [
            { field: 'avatar', urlField: 'avatar_url' },
            { field: 'shop.logo', urlField: 'logo_url' },
            { field: 'products[].image', urlField: 'image_url' },
            { field: 'gallery[].photo', urlField: 'photo_url' },
        ];
        const result = await this.photoManager.appendPhotoUrls(body, photoFields);
        return result;
    }
    async getUploadUrl(filename, size) {
        const result = await this.cloudflare.getUploadUrl(filename, parseInt(size) || 1000);
        return result;
    }
    async getDownloadUrl(key) {
        const result = await this.cloudflare.getDownloadUrl(key);
        return result;
    }
    async deleteFile(key) {
        const result = await this.cloudflare.deleteFile(key);
        return { success: result, key };
    }
};
exports.TestController = TestController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TestController.prototype, "health", null);
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('delete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('append-urls'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestController.prototype, "appendUrls", null);
__decorate([
    (0, common_1.Get)('upload-url'),
    __param(0, (0, common_1.Query)('filename')),
    __param(1, (0, common_1.Query)('size')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TestController.prototype, "getUploadUrl", null);
__decorate([
    (0, common_1.Get)('download-url'),
    __param(0, (0, common_1.Query)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TestController.prototype, "getDownloadUrl", null);
__decorate([
    (0, common_1.Delete)('delete-file'),
    __param(0, (0, common_1.Query)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TestController.prototype, "deleteFile", null);
exports.TestController = TestController = __decorate([
    (0, common_1.Controller)('test'),
    __metadata("design:paramtypes", [nestjs_r2_storage_1.PhotoManagerService,
        nestjs_r2_storage_1.CloudflareService])
], TestController);
//# sourceMappingURL=test.controller.js.map
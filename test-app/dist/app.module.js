"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_r2_storage_1 = require("nestjs-r2-storage");
const test_controller_1 = require("./test.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            nestjs_r2_storage_1.R2StorageModule.forRoot({
                endpoint: process.env.R2_ENDPOINT || 'https://example.r2.cloudflarestorage.com',
                accessKeyId: process.env.R2_ACCESS_KEY || 'test-key',
                secretAccessKey: process.env.R2_SECRET_KEY || 'test-secret',
                bucketName: process.env.R2_BUCKET || 'test-bucket',
                region: 'auto',
                publicUrlBase: process.env.R2_PUBLIC_URL,
                signedUrlExpiry: 3600,
            }),
        ],
        controllers: [test_controller_1.TestController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
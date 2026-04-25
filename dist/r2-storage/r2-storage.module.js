"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var R2StorageModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.R2StorageModule = void 0;
const common_1 = require("@nestjs/common");
const cloudflare_service_1 = require("./cloudflare.service");
const photo_manager_service_1 = require("./photo-manager.service");
const constants_1 = require("./constants");
let R2StorageModule = R2StorageModule_1 = class R2StorageModule {
    static forRoot(options, moduleOptions = {}) {
        return {
            module: R2StorageModule_1,
            global: moduleOptions.isGlobal ?? true,
            providers: [
                {
                    provide: constants_1.STORAGE_OPTIONS,
                    useValue: options,
                },
                cloudflare_service_1.CloudflareService,
                photo_manager_service_1.PhotoManagerService,
            ],
            exports: [cloudflare_service_1.CloudflareService, photo_manager_service_1.PhotoManagerService],
        };
    }
    static forRootAsync(optionsFactory, moduleOptions = {}) {
        return {
            module: R2StorageModule_1,
            global: moduleOptions.isGlobal ?? true,
            providers: [
                {
                    provide: constants_1.STORAGE_OPTIONS,
                    useFactory: async () => {
                        const options = await optionsFactory();
                        return options;
                    },
                },
                cloudflare_service_1.CloudflareService,
                photo_manager_service_1.PhotoManagerService,
            ],
            exports: [cloudflare_service_1.CloudflareService, photo_manager_service_1.PhotoManagerService],
        };
    }
};
exports.R2StorageModule = R2StorageModule;
exports.R2StorageModule = R2StorageModule = R2StorageModule_1 = __decorate([
    (0, common_1.Module)({})
], R2StorageModule);
//# sourceMappingURL=r2-storage.module.js.map
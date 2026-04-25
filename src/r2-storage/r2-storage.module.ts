import { Module, DynamicModule } from "@nestjs/common";
import { CloudflareService } from "./cloudflare.service";
import { PhotoManagerService } from "./photo-manager.service";
import {
  StorageOptions,
  StorageModuleOptions,
} from "./interfaces/storage-options.interface";
import { STORAGE_OPTIONS } from "./constants";

@Module({})
export class R2StorageModule {
  static forRoot(
    options: StorageOptions,
    moduleOptions: StorageModuleOptions = {},
  ): DynamicModule {
    return {
      module: R2StorageModule,
      global: moduleOptions.isGlobal ?? true,
      providers: [
        {
          provide: STORAGE_OPTIONS,
          useValue: options,
        },
        CloudflareService,
        PhotoManagerService,
      ],
      exports: [CloudflareService, PhotoManagerService],
    };
  }

  static forRootAsync(
    optionsFactory: () => Promise<StorageOptions> | StorageOptions,
    moduleOptions: StorageModuleOptions = {},
  ): DynamicModule {
    return {
      module: R2StorageModule,
      global: moduleOptions.isGlobal ?? true,
      providers: [
        {
          provide: STORAGE_OPTIONS,
          useFactory: async () => {
            const options = await optionsFactory();
            return options;
          },
        },
        CloudflareService,
        PhotoManagerService,
      ],
      exports: [CloudflareService, PhotoManagerService],
    };
  }
}

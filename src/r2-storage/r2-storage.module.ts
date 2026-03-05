import {
  Module,
  Global,
  ModuleMetadata,
  Optional,
  DynamicModule,
} from '@nestjs/common';
import { CloudflareService } from './cloudflare.service';
import { PhotoManagerService } from './photo-manager.service';
import { StorageOptions, StorageModuleOptions } from './interfaces/storage-options.interface';

export const STORAGE_OPTIONS = 'STORAGE_OPTIONS';

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

@Global()
@Module({})
export class R2StorageModuleWithOptions {
  static forRoot(
    options: StorageOptions,
    moduleOptions: StorageModuleOptions = {},
  ): DynamicModule {
    return {
      module: R2StorageModuleWithOptions,
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
      module: R2StorageModuleWithOptions,
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

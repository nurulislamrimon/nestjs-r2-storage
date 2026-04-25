import { DynamicModule } from "@nestjs/common";
import { StorageModuleOptions, StorageOptions } from "./interfaces/storage-options.interface";
export declare class R2StorageModule {
    static forRoot(options: StorageOptions, moduleOptions?: StorageModuleOptions): DynamicModule;
    static forRootAsync(optionsFactory: () => Promise<StorageOptions> | StorageOptions, moduleOptions?: StorageModuleOptions): DynamicModule;
}

export {
  StorageOptions,
  FileFieldConfig,
  PhotoFieldConfig,
  StorageModuleOptions,
  AccessMode,
} from './r2-storage/interfaces/storage-options.interface';

export {
  CloudflareService,
  UploadUrlResult,
  DownloadUrlResult,
  FileInfo,
  AccessModeError,
} from './r2-storage/cloudflare.service';

export {
  PhotoManagerService,
  PhotoField,
  PhotoUploadRequest,
  PhotoUploadResponse,
  CreatePhotosResult,
  UpdatePhotosResult,
  DeletePhotosResult,
  AppendUrlsOptions,
} from './r2-storage/photo-manager.service';

export {
  R2StorageModule,
} from './r2-storage/r2-storage.module';

export {
  PhotoFields,
  UploadUrls,
  StorageInfo,
} from './r2-storage/decorators/photo-fields.decorator';

export {
  parseFieldPath,
  getNestedValue,
  setNestedValue,
  collectNestedValues,
  isArrayPath,
  getArrayBasePath,
  getArrayElementPath,
  getAllArrayItemPaths,
  ParsedPath,
  PathSegment,
} from './r2-storage/utils/nested-value.util';

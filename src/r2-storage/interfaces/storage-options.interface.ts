export interface StorageOptions {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region?: string;
  publicUrlBase?: string;
  signedUrlExpiry?: number;
}

export interface FileFieldConfig {
  field: string;
  sizeField?: string;
}

export interface PhotoFieldConfig {
  field: string;
  urlField?: string;
  sizeField?: string;
}

export interface StorageModuleOptions {
  isGlobal?: boolean;
}

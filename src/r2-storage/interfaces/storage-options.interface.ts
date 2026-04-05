/**
 * Access mode configuration for Cloudflare R2 storage.
 * 
 * IMPORTANT: Cloudflare R2 does NOT enforce ACLs like AWS S3. The R2 API ignores ACL headers.
 * True security is achieved by:
 * - NOT exposing public URLs (use "private" mode)
 * - Using signed URLs for upload and download (presigned URLs)
 * - Proxying file access through your backend when needed
 * 
 * "private": Only allow presigned URL uploads and access. Do NOT generate or return public URLs.
 * "public-read": Allow public URL access. Signed URL upload is optional.
 * "hybrid": Allow both public and signed access.
 */
export type AccessMode = 'private' | 'public-read' | 'hybrid';

export interface StorageOptions {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region?: string;
  publicUrlBase?: string;
  signedUrlExpiry?: number;
  /**
   * Access mode for file uploads and access control.
   * Defaults to 'hybrid' for backward compatibility.
   */
  accessMode?: AccessMode;
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

export interface UploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string | null;
  mimeType: string;
  /**
   * File size constraint for client-side validation.
   * This is NOT passed to AWS SDK signing to avoid SignatureDoesNotMatch errors.
   * Clients should validate file size before uploading.
   */
  sizeField?: number;
}

export interface DownloadUrlResult {
  downloadUrl: string;
  publicUrl: string | null;
}

export interface FileInfo {
  size: number;
  lastModified?: Date;
  contentType?: string;
}

export interface UploadUrlResult {
    uploadUrl: string;
    fileKey: string;
    publicUrl: string | null;
    mimeType: string;
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

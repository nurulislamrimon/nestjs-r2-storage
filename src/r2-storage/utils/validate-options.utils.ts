import { StorageOptions } from "../interfaces/storage-options.interface";

export function validateOptions(options: StorageOptions): void {
  if (!options) {
    throw new Error("StorageOptions is required");
  }

  if (!options.endpoint) {
    throw new Error("Missing 'endpoint'");
  }

  if (!options.accessKeyId) {
    throw new Error("Missing 'accessKeyId'");
  }

  if (!options.secretAccessKey) {
    throw new Error("Missing 'secretAccessKey'");
  }

  if (!options.bucketName) {
    throw new Error("Missing 'bucketName'");
  }
}

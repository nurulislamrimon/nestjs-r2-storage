"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptions = validateOptions;
function validateOptions(options) {
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
//# sourceMappingURL=validate-options.utils.js.map
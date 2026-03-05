"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageInfo = exports.UploadUrls = exports.PhotoFields = void 0;
const common_1 = require("@nestjs/common");
exports.PhotoFields = (0, common_1.createParamDecorator)((data, ctx) => {
    return data.photoFields;
});
exports.UploadUrls = (0, common_1.createParamDecorator)((data, ctx) => {
    return data.uploadUrls;
});
exports.StorageInfo = (0, common_1.createParamDecorator)((data, ctx) => {
    return data;
});
//# sourceMappingURL=photo-fields.decorator.js.map
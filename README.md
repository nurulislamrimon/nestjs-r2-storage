# nestjs-r2-storage

[![npm version](https://img.shields.io/npm/v/nestjs-r2-storage.svg)](https://www.npmjs.com/package/nestjs-r2-storage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Author:** Nurul Islam Rimon  
**GitHub:** [https://github.com/nurulislamrimon/nestjs-r2-storage](https://github.com/nurulislamrimon/nestjs-r2-storage)

Production-ready NestJS module for Cloudflare R2 object storage management.

## Features

- **Signed Upload URLs** - Generate presigned URLs for direct file uploads
- **Signed Download URLs** - Generate presigned URLs for secure file downloads
- **File Deletion** - Delete files from R2 storage
- **Nested Field Support** - Handle paths like `shop.logo`, `profile.avatar`
- **Array Field Support** - Handle paths like `products[].image`, `gallery[].photo`
- **Storage Usage Tracking** - Track storage used, increased, and decreased
- **Full CRUD Lifecycle** - Create, Update, Delete file operations

## Installation

```bash
npm install nestjs-r2-storage
```

## Quick Start

### 1. Configure the Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { R2StorageModule } from 'nestjs-r2-storage';

@Module({
  imports: [
    R2StorageModule.forRoot({
      endpoint: process.env.R2_ENDPOINT,
      accessKeyId: process.env.R2_ACCESS_KEY,
      secretAccessKey: process.env.R2_SECRET_KEY,
      bucketName: process.env.R2_BUCKET,
      region: 'auto',
      publicUrlBase: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}`,
      signedUrlExpiry: 3600,
    }),
  ],
})
export class AppModule {}
```

### 2. Use in Your Service

```typescript
import { Injectable } from '@nestjs/common';
import { PhotoManagerService, PhotoField, CloudflareService } from 'nestjs-r2-storage';

@Injectable()
export class ProductService {
  constructor(
    private readonly photoManager: PhotoManagerService,
    private readonly cloudflare: CloudflareService,
  ) {}

  async createProduct(payload: any) {
    const photoFields: PhotoField[] = [
      { field: 'image', urlField: 'image_url', sizeField: 'image_size' },
      { field: 'gallery[].photo', urlField: 'photo_url', sizeField: 'photo_size' },
    ];

    const result = await this.photoManager.createObjectWithPhotos(payload, photoFields);
    
    // Return upload URLs to client for direct upload
    return {
      product: result.updatedPayload,
      uploadUrls: result.uploadUrls,
      totalStorageUsed: result.totalStorageUsed,
    };
  }

  async getProduct(id: string) {
    const product = await this.findProduct(id);
    
    const photoFields: PhotoField[] = [
      { field: 'image', urlField: 'image_url' },
      { field: 'gallery[].photo', urlField: 'photo_url' },
    ];

    return this.photoManager.appendPhotoUrls(product, photoFields);
  }

  async updateProduct(id: string, payload: any) {
    const existing = await this.findProduct(id);
    
    const photoFields: PhotoField[] = [
      { field: 'image', urlField: 'image_url', sizeField: 'image_size' },
    ];

    const result = await this.photoManager.updateObjectWithPhotos(payload, existing, photoFields);
    
    return {
      product: result.updatedPayload,
      uploadUrls: result.uploadUrls,
      storageIncrease: result.storageIncrease,
      storageDecrease: result.storageDecrease,
    };
  }

  async deleteProduct(id: string) {
    const product = await this.findProduct(id);
    
    const photoFields: PhotoField[] = [
      { field: 'image', urlField: 'image_url' },
    ];

    await this.photoManager.deletePhotosFromObject(product, photoFields);
    await this.removeProduct(id);
  }
}
```

## API Reference

### CloudflareService

Direct R2 operations.

```typescript
// Generate upload URL
const uploadUrl = await cloudflare.getUploadUrl('avatar.png', 1024000);

// Generate download URL
const downloadUrl = await cloudflare.getDownloadUrl('uploads/avatar_123.png');

// Delete file
await cloudflare.deleteFile('uploads/avatar.png');

// Check if file exists
const exists = await cloudflare.fileExists('uploads/avatar.png');
```

### PhotoManagerService

High-level photo management.

#### appendPhotoUrls()

Adds signed URLs to response objects.

```typescript
const photoFields: PhotoField[] = [
  { field: 'avatar', urlField: 'avatar_url' },
  { field: 'shop.logo', urlField: 'logo_url' },
  { field: 'products[].image', urlField: 'image_url' },
  { field: 'gallery[].photo', urlField: 'photo_url' },
];

const result = await photoManager.appendPhotoUrls(product, photoFields);
```

Input:
```json
{
  "name": "Laptop",
  "image": "laptop.png",
  "gallery": [
    { "photo": "photo1.jpg" },
    { "photo": "photo2.jpg" }
  ]
}
```

Output:
```json
{
  "name": "Laptop",
  "image": "laptop.png",
  "image_url": "https://signed-url...",
  "gallery": [
    { "photo": "photo1.jpg", "photo_url": "https://signed-url..." },
    { "photo": "photo2.jpg", "photo_url": "https://signed-url..." }
  ]
}
```

#### createObjectWithPhotos()

Creates object with photo upload URLs.

```typescript
const payload = {
  name: "Laptop",
  image: "laptop.png",
  image_size: 42000,
  gallery: [
    { photo: "photo1.jpg", photo_size: 10000 },
    { photo: "photo2.jpg", photo_size: 15000 }
  ]
};

const photoFields: PhotoField[] = [
  { field: 'image', sizeField: 'image_size' },
  { field: 'gallery[].photo', sizeField: 'gallery[].photo_size' },
];

const result = await photoManager.createObjectWithPhotos(payload, photoFields);

// result = {
//   updatedPayload: { ...with generated file keys... },
//   uploadUrls: [{ field, fileKey, uploadUrl, publicUrl }],
//   totalStorageUsed: 67000
// }
```

#### updateObjectWithPhotos()

Updates object with new photos, deletes old files.

```typescript
const result = await photoManager.updateObjectWithPhotos(
  newPayload,
  existingObject,
  photoFields,
);

// result = {
//   updatedPayload: { ... },
//   uploadUrls: [{ field, fileKey, uploadUrl, publicUrl }],
//   storageIncrease: 1000,
//   storageDecrease: 500,
//   deletedFiles: ['old-file.png']
// }
```

#### deletePhotosFromObject()

Deletes all photos from object.

```typescript
const result = await photoManager.deletePhotosFromObject(product, photoFields);

// result = {
//   deletedFiles: ['file1.png', 'file2.jpg'],
//   totalStorageFreed: 25000
// }
```

## Field Path Syntax

### Simple Nested Fields

```
shop.logo
profile.avatar
products[].image
```

### Array Fields

```
gallery[].photo        -> gallery[0].photo, gallery[1].photo, ...
products[].images[]    -> products[0].images[0], products[0].images[1], ...
```

## Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `endpoint` | string | Yes | R2 endpoint URL |
| `accessKeyId` | string | Yes | R2 access key ID |
| `secretAccessKey` | string | Yes | R2 secret access key |
| `bucketName` | string | Yes | R2 bucket name |
| `region` | string | No | AWS region (default: 'auto') |
| `publicUrlBase` | string | No | Base URL for public access |
| `signedUrlExpiry` | number | No | Signed URL expiry in seconds (default: 3600) |

## Async Configuration

```typescript
R2StorageModule.forRootAsync({
  useFactory: () => ({
    endpoint: process.env.R2_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
    bucketName: process.env.R2_BUCKET,
  }),
})
```

## License

MIT

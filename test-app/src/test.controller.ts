import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { PhotoManagerService, PhotoField, CloudflareService } from 'nestjs-r2-storage';

@Controller('test')
export class TestController {
  constructor(
    private readonly photoManager: PhotoManagerService,
    private readonly cloudflare: CloudflareService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'CloudflareService & PhotoManagerService' };
  }

  @Post('create')
  async create(@Body() body: any) {
    const photoFields: PhotoField[] = [
      { field: 'avatar', urlField: 'avatar_url', sizeField: 'avatar_size' },
      { field: 'shop.logo', urlField: 'logo_url', sizeField: 'logo_size' },
      { field: 'products[].image', urlField: 'image_url', sizeField: 'image_size' },
      { field: 'gallery[].photo', urlField: 'photo_url', sizeField: 'photo_size' },
    ];

    const result = await this.photoManager.createObjectWithPhotos(body, photoFields);
    return result;
  }

  @Post('update')
  async update(@Body() body: { payload: any; existing: any }) {
    const photoFields: PhotoField[] = [
      { field: 'avatar', urlField: 'avatar_url', sizeField: 'avatar_size' },
      { field: 'shop.logo', urlField: 'logo_url', sizeField: 'logo_size' },
      { field: 'products[].image', urlField: 'image_url', sizeField: 'image_size' },
      { field: 'gallery[].photo', urlField: 'photo_url', sizeField: 'photo_size' },
    ];

    const result = await this.photoManager.updateObjectWithPhotos(
      body.payload,
      body.existing,
      photoFields,
    );
    return result;
  }

  @Post('delete')
  async delete(@Body() body: any) {
    const photoFields: PhotoField[] = [
      { field: 'avatar', urlField: 'avatar_url', sizeField: 'avatar_size' },
      { field: 'shop.logo', urlField: 'logo_url', sizeField: 'logo_size' },
      { field: 'products[].image', urlField: 'image_url', sizeField: 'image_size' },
      { field: 'gallery[].photo', urlField: 'photo_url', sizeField: 'photo_size' },
    ];

    const result = await this.photoManager.deletePhotosFromObject(body, photoFields);
    return result;
  }

  @Post('append-urls')
  async appendUrls(@Body() body: any) {
    const photoFields: PhotoField[] = [
      { field: 'avatar', urlField: 'avatar_url' },
      { field: 'shop.logo', urlField: 'logo_url' },
      { field: 'products[].image', urlField: 'image_url' },
      { field: 'gallery[].photo', urlField: 'photo_url' },
    ];

    const result = await this.photoManager.appendPhotoUrls(body, photoFields);
    return result;
  }

  @Get('upload-url')
  async getUploadUrl(@Query('filename') filename: string, @Query('size') size: string) {
    const result = await this.cloudflare.getUploadUrl(filename, parseInt(size) || 1000);
    return result;
  }

  @Get('download-url')
  async getDownloadUrl(@Query('key') key: string) {
    const result = await this.cloudflare.getDownloadUrl(key);
    return result;
  }

  @Delete('delete-file')
  async deleteFile(@Query('key') key: string) {
    const result = await this.cloudflare.deleteFile(key);
    return { success: result, key };
  }
}

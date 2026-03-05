import { Module } from '@nestjs/common';
import { R2StorageModule } from 'nestjs-r2-storage';
import { TestController } from './test.controller';

@Module({
  imports: [
    R2StorageModule.forRoot({
      endpoint: process.env.R2_ENDPOINT || 'https://example.r2.cloudflarestorage.com',
      accessKeyId: process.env.R2_ACCESS_KEY || 'test-key',
      secretAccessKey: process.env.R2_SECRET_KEY || 'test-secret',
      bucketName: process.env.R2_BUCKET || 'test-bucket',
      region: 'auto',
      publicUrlBase: process.env.R2_PUBLIC_URL,
      signedUrlExpiry: 3600,
    }),
  ],
  controllers: [TestController],
})
export class AppModule {}

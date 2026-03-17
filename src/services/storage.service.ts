import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ExternalServiceError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export interface UploadOptions {
  file: Buffer;
  fileName: string;
  mimeType: string;
  folder?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: config.s3.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
    this.bucket = config.s3.bucket;
  }

  async uploadFile(options: UploadOptions): Promise<UploadResult> {
    try {
      const key = this.generateKey(options.fileName, options.folder);

      logger.info('Uploading file to S3', {
        key,
        bucket: this.bucket,
        size: options.file.length,
      });

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: options.file,
        ContentType: options.mimeType,
      });

      await this.s3Client.send(command);

      const url = await this.getSignedUrl(key);

      logger.info('File uploaded successfully', {
        key,
        url,
      });

      return {
        key,
        url,
        bucket: this.bucket,
      };
    } catch (error: any) {
      logger.error('Failed to upload file to S3', {
        error: error.message,
        fileName: options.fileName,
      });
      throw new ExternalServiceError(error.message, 'AWS S3');
    }
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresIn || config.s3.presignedUrlExpires,
      });

      return url;
    } catch (error: any) {
      logger.error('Failed to generate signed URL', {
        error: error.message,
        key,
      });
      throw new ExternalServiceError(error.message, 'AWS S3');
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      logger.info('Downloading file from S3', {
        key,
        bucket: this.bucket,
      });

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      const stream = response.Body as any;
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error: any) {
      logger.error('Failed to download file from S3', {
        error: error.message,
        key,
      });
      throw new ExternalServiceError(error.message, 'AWS S3');
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      logger.info('Deleting file from S3', {
        key,
        bucket: this.bucket,
      });

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info('File deleted successfully', { key });
      return true;
    } catch (error: any) {
      logger.error('Failed to delete file from S3', {
        error: error.message,
        key,
      });
      throw new ExternalServiceError(error.message, 'AWS S3');
    }
  }

  async uploadBase64File(
    base64Data: string,
    fileName: string,
    mimeType: string,
    folder?: string
  ): Promise<UploadResult> {
    const buffer = Buffer.from(base64Data, 'base64');

    return this.uploadFile({
      file: buffer,
      fileName,
      mimeType,
      folder,
    });
  }

  private generateKey(fileName: string, folder?: string): string {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const extension = fileName.split('.').pop();
    const sanitizedName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);

    const key = `${uuid}-${timestamp}-${sanitizedName}`;

    if (folder) {
      return `${folder}/${key}`;
    }

    return key;
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
  }
}

export const storageService = new StorageService();

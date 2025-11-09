/**
 * File Upload Utility for Cloudflare R2
 * Handles audio file uploads with multiple quality support
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../config/index.js';
import logger from './logger.js';
import ApiError from './apiError.js';
import { AUDIO_QUALITIES, QUALITY_FOLDERS, R2_CONFIG, SUPPORTED_AUDIO_FORMATS } from './constants.js';
import crypto from 'crypto';
import path from 'path';

class FileUploadHelper {
  constructor() {
    this.s3Client = null;
    this.initialized = false;
  }

  /**
   * Initialize S3 client for Cloudflare R2
   */
  initializeClient() {
    if (this.initialized) return;

    try {
      if (!config.r2.accountId || !config.r2.accessKeyId || !config.r2.secretAccessKey) {
        throw new Error('R2 configuration missing');
      }

      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.r2.accessKeyId,
          secretAccessKey: config.r2.secretAccessKey,
        },
      });

      this.initialized = true;
      logger.info('R2 S3 client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize R2 client:', error);
      throw new ApiError(500, 'Storage service initialization failed');
    }
  }

  /**
   * Get S3 client instance
   */
  getClient() {
    if (!this.initialized) {
      this.initializeClient();
    }
    return this.s3Client;
  }

  /**
   * Generate unique file key
   * @param {string} originalFilename - Original file name
   * @param {string} quality - Audio quality
   * @returns {string} Unique R2 key
   */
  generateFileKey(originalFilename, quality = AUDIO_QUALITIES.ORIGINAL) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, ext);
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    return `${QUALITY_FOLDERS[quality]}${timestamp}-${randomString}-${sanitizedName}${ext}`;
  }

  /**
   * Validate file type and size
   * @param {string} mimeType - File MIME type
   * @param {number} fileSize - File size in bytes
   * @throws {ApiError} If validation fails
   */
  validateFile(mimeType, fileSize) {
    // Check file type
    if (!SUPPORTED_AUDIO_FORMATS.includes(mimeType)) {
      throw ApiError.badRequest(
        `Unsupported file type: ${mimeType}. Supported formats: MP3, FLAC, WAV, AAC, OGG`
      );
    }

    // Check file size
    if (fileSize > R2_CONFIG.MAX_UPLOAD_SIZE) {
      const maxSizeMB = R2_CONFIG.MAX_UPLOAD_SIZE / (1024 * 1024);
      throw ApiError.badRequest(`File too large. Maximum size: ${maxSizeMB}MB`);
    }

    // Check minimum size (1KB)
    if (fileSize < 1024) {
      throw ApiError.badRequest('File too small. Minimum size: 1KB');
    }
  }

  /**
   * Upload file to R2
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileKey - R2 key
   * @param {string} mimeType - File MIME type
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(fileBuffer, fileKey, mimeType, metadata = {}) {
    try {
      const client = this.getClient();

      const command = new PutObjectCommand({
        Bucket: config.r2.bucketName,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimeType,
        Metadata: {
          uploadedAt: new Date().toISOString(),
          ...metadata,
        },
      });

      await client.send(command);

      logger.info(`File uploaded successfully: ${fileKey}`);

      return {
        success: true,
        key: fileKey,
        size: fileBuffer.length,
        bucket: config.r2.bucketName,
        url: config.r2.publicUrl ? `${config.r2.publicUrl}/${fileKey}` : null,
      };
    } catch (error) {
      logger.error(`File upload failed for ${fileKey}:`, error);
      throw new ApiError(500, 'File upload failed', [error.message]);
    }
  }

  /**
   * Generate signed URL for streaming
   * @param {string} fileKey - R2 key
   * @param {number} expiresIn - URL expiry in seconds
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(fileKey, expiresIn = R2_CONFIG.SIGNED_URL_EXPIRY) {
    try {
      const client = this.getClient();

      const command = new GetObjectCommand({
        Bucket: config.r2.bucketName,
        Key: fileKey,
      });

      const signedUrl = await getSignedUrl(client, command, {
        expiresIn,
      });

      logger.debug(`Generated signed URL for: ${fileKey}`);
      return signedUrl;
    } catch (error) {
      logger.error(`Failed to generate signed URL for ${fileKey}:`, error);
      throw new ApiError(500, 'Failed to generate stream URL');
    }
  }

  /**
   * Delete file from R2
   * @param {string} fileKey - R2 key
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileKey) {
    try {
      const client = this.getClient();

      const command = new DeleteObjectCommand({
        Bucket: config.r2.bucketName,
        Key: fileKey,
      });

      await client.send(command);
      logger.info(`File deleted successfully: ${fileKey}`);
      return true;
    } catch (error) {
      logger.error(`File deletion failed for ${fileKey}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple files
   * @param {string[]} fileKeys - Array of R2 keys
   * @returns {Promise<Object>} Deletion results
   */
  async deleteFiles(fileKeys) {
    const results = {
      success: [],
      failed: [],
    };

    for (const key of fileKeys) {
      try {
        const deleted = await this.deleteFile(key);
        if (deleted) {
          results.success.push(key);
        } else {
          results.failed.push(key);
        }
      } catch (error) {
        results.failed.push(key);
      }
    }

    logger.info(`Bulk delete: ${results.success.length} succeeded, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Check if file exists in R2
   * @param {string} fileKey - R2 key
   * @returns {Promise<boolean>} File exists status
   */
  async fileExists(fileKey) {
    try {
      const client = this.getClient();

      const command = new HeadObjectCommand({
        Bucket: config.r2.bucketName,
        Key: fileKey,
      });

      await client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error(`Error checking file existence for ${fileKey}:`, error);
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param {string} fileKey - R2 key
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(fileKey) {
    try {
      const client = this.getClient();

      const command = new HeadObjectCommand({
        Bucket: config.r2.bucketName,
        Key: fileKey,
      });

      const response = await client.send(command);

      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      logger.error(`Failed to get metadata for ${fileKey}:`, error);
      throw new ApiError(404, 'File not found');
    }
  }

  /**
   * Upload multiple quality versions
   * @param {Object} files - Object with quality keys and file buffers
   * @param {string} baseName - Base file name
   * @param {string} mimeType - File MIME type
   * @returns {Promise<Object>} Upload results
   */
  async uploadMultipleQualities(files, baseName, mimeType) {
    const results = {};
    const errors = [];

    for (const [quality, buffer] of Object.entries(files)) {
      try {
        const fileKey = this.generateFileKey(baseName, quality);
        const result = await this.uploadFile(buffer, fileKey, mimeType, { quality });
        results[quality] = {
          key: fileKey,
          size: buffer.length,
          url: result.url,
        };
      } catch (error) {
        logger.error(`Failed to upload ${quality} quality:`, error);
        errors.push({ quality, error: error.message });
      }
    }

    if (errors.length > 0) {
      logger.warn(`Some quality uploads failed:`, errors);
    }

    return {
      success: Object.keys(results).length > 0,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Generate public URL (if R2 public access is enabled)
   * @param {string} fileKey - R2 key
   * @returns {string} Public URL
   */
  getPublicUrl(fileKey) {
    if (!config.r2.publicUrl) {
      logger.warn('R2 public URL not configured');
      return null;
    }
    return `${config.r2.publicUrl}/${fileKey}`;
  }
}

// Export singleton instance
const fileUploadHelper = new FileUploadHelper();
export default fileUploadHelper;

// Export class for testing
export { FileUploadHelper };

// Import GetObjectCommand that was missing
import { GetObjectCommand } from '@aws-sdk/client-s3';

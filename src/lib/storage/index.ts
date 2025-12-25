import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = process.env.R2_ENDPOINT
  ? new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'family-powerhouse';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  key: string;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  familyId: string,
  folder: string = 'attachments'
): Promise<UploadResult> {
  if (!s3Client) {
    throw new Error('Storage not configured');
  }

  if (file.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const extension = fileName.split('.').pop() || '';
  const key = `${familyId}/${folder}/${uuidv4()}.${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      Metadata: {
        originalFileName: fileName,
        familyId,
      },
    })
  );

  const url = `${process.env.R2_PUBLIC_URL}/${key}`;

  return {
    key,
    url,
    fileName,
    fileType: contentType,
    fileSize: file.length,
  };
}

export async function deleteFile(key: string): Promise<void> {
  if (!s3Client) {
    throw new Error('Storage not configured');
  }

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!s3Client) {
    throw new Error('Storage not configured');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function getSignedUploadUrl(
  fileName: string,
  contentType: string,
  familyId: string,
  folder: string = 'attachments'
): Promise<{ key: string; uploadUrl: string }> {
  if (!s3Client) {
    throw new Error('Storage not configured');
  }

  const extension = fileName.split('.').pop() || '';
  const key = `${familyId}/${folder}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { key, uploadUrl };
}

export function isStorageConfigured(): boolean {
  return !!s3Client;
}

// Placeholder for virus scanning hook
export async function scanFile(_file: Buffer): Promise<{ safe: boolean; threat?: string }> {
  // TODO: Integrate with actual virus scanning service (e.g., ClamAV, VirusTotal)
  // For now, return safe by default
  return { safe: true };
}

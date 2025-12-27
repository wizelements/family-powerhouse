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

export interface FileScanResult {
  safe: boolean;
  threat?: string;
  scannedAt: Date;
  provider?: string;
}

const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;
const SCAN_ENABLED = !!VIRUSTOTAL_API_KEY;

async function scanWithVirusTotal(file: Buffer): Promise<FileScanResult> {
  if (!VIRUSTOTAL_API_KEY) {
    console.warn('[FileScan] VirusTotal API key not configured');
    return { safe: true, scannedAt: new Date(), provider: 'none' };
  }

  try {
    // Upload file to VirusTotal
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(file)]));

    const uploadResponse = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      console.error('[FileScan:VirusTotal] Upload failed:', uploadResponse.status);
      return { safe: true, scannedAt: new Date(), provider: 'virustotal-error' };
    }

    const uploadResult = await uploadResponse.json();
    const analysisId = uploadResult.data?.id;

    if (!analysisId) {
      console.error('[FileScan:VirusTotal] No analysis ID returned');
      return { safe: true, scannedAt: new Date(), provider: 'virustotal-error' };
    }

    // Poll for results (with timeout)
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const analysisResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
        headers: { 'x-apikey': VIRUSTOTAL_API_KEY },
      });

      if (!analysisResponse.ok) {
        attempts++;
        continue;
      }

      const analysisResult = await analysisResponse.json();
      const status = analysisResult.data?.attributes?.status;

      if (status === 'completed') {
        const stats = analysisResult.data?.attributes?.stats || {};
        const malicious = stats.malicious || 0;
        const suspicious = stats.suspicious || 0;

        if (malicious > 0 || suspicious > 0) {
          return {
            safe: false,
            threat: `Detected by ${malicious} scanners (${suspicious} suspicious)`,
            scannedAt: new Date(),
            provider: 'virustotal',
          };
        }

        return { safe: true, scannedAt: new Date(), provider: 'virustotal' };
      }

      attempts++;
    }

    console.warn('[FileScan:VirusTotal] Analysis timed out');
    return { safe: true, scannedAt: new Date(), provider: 'virustotal-timeout' };
  } catch (error) {
    console.error('[FileScan:VirusTotal] Error:', error);
    return { safe: true, scannedAt: new Date(), provider: 'virustotal-error' };
  }
}

const DANGEROUS_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.ps1', '.vbs', '.js', '.jse',
  '.wsf', '.wsh', '.scr', '.pif', '.com', '.msi', '.msp', '.hta',
];

const DANGEROUS_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-msdos-program',
];

function quickScan(fileName: string, contentType: string): FileScanResult | null {
  const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0];
  
  if (ext && DANGEROUS_EXTENSIONS.includes(ext)) {
    return {
      safe: false,
      threat: `Potentially dangerous file type: ${ext}`,
      scannedAt: new Date(),
      provider: 'quick-scan',
    };
  }

  if (DANGEROUS_MIME_TYPES.includes(contentType)) {
    return {
      safe: false,
      threat: `Potentially dangerous content type: ${contentType}`,
      scannedAt: new Date(),
      provider: 'quick-scan',
    };
  }

  return null;
}

export async function scanFile(file: Buffer, fileName?: string, contentType?: string): Promise<FileScanResult> {
  // Quick scan for dangerous file types
  if (fileName && contentType) {
    const quickResult = quickScan(fileName, contentType);
    if (quickResult && !quickResult.safe) {
      return quickResult;
    }
  }

  // Full scan with VirusTotal if configured
  if (SCAN_ENABLED) {
    return scanWithVirusTotal(file);
  }

  // No scanning configured - log warning and allow
  console.warn('[FileScan] No virus scanning configured. File allowed by default.');
  return { safe: true, scannedAt: new Date(), provider: 'none' };
}

export function isFileScanningConfigured(): boolean {
  return SCAN_ENABLED;
}

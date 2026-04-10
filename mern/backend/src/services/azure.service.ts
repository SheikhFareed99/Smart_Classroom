import { BlobServiceClient, ContainerClient, BlobHTTPHeaders } from "@azure/storage-blob";
import dotenv from "dotenv";
dotenv.config();

const CONNECTION_STRING =
  process.env.AZURE_STORAGE_CONNECTION_STRING ||
  process.env.connectionstring ||
  "";

const CONTAINER_NAME =
  process.env.AZURE_BLOB_CONTAINER ||
  process.env.blob_container ||
  "smartclassroom";

let _blobService: BlobServiceClient | null = null;
let _container: ContainerClient | null = null;

function getBlobService(): BlobServiceClient {
  if (!_blobService) {
    if (!CONNECTION_STRING) {
      throw new Error("Azure Storage connection string is not configured");
    }
    _blobService = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
  }
  return _blobService;
}

async function getContainer(): Promise<ContainerClient> {
  if (!_container) {
    _container = getBlobService().getContainerClient(CONTAINER_NAME);
    const exists = await _container.exists();
    if (!exists) {
      await _container.create({ access: "blob" });
      console.log(`Azure container '${CONTAINER_NAME}' created.`);
    }
  }
  return _container;
}

/**
 * Upload a Buffer to Azure Blob Storage and return the public URL.
 */
export async function uploadBuffer(
  buffer: Buffer,
  blobPath: string,
  contentType: string = "application/octet-stream"
): Promise<string> {
  const container = await getContainer();
  const blobClient = container.getBlockBlobClient(blobPath);

  const blobHTTPHeaders: BlobHTTPHeaders = { blobContentType: contentType };

  await blobClient.uploadData(buffer, { blobHTTPHeaders });

  return blobClient.url;
}

/**
 * Delete a blob from Azure Blob Storage.
 */
export async function deleteBlob(blobPath: string): Promise<void> {
  try {
    const container = await getContainer();
    const blobClient = container.getBlockBlobClient(blobPath);
    await blobClient.deleteIfExists();
  } catch (err) {
    console.warn(`Failed to delete blob '${blobPath}':`, err);
  }
}

/**
 * Extract the blob path from a full Azure URL.
 * e.g. "https://account.blob.core.windows.net/container/courses/abc/file.pdf"
 * → "courses/abc/file.pdf"
 */
export function blobPathFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.slice(1).join("/");
  } catch {
    return null;
  }
}

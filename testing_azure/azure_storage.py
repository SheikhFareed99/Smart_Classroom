"""
Azure Blob Storage helper — upload, download, list, and delete blobs.
"""

from azure.storage.blob import BlobServiceClient, ContainerClient, ContentSettings
from typing import List, Optional
import os


class AzureBlobManager:

    def __init__(self, connection_string: str, container_name: str):
        self.connection_string = connection_string
        self.container_name = container_name
        self.blob_service = BlobServiceClient.from_connection_string(connection_string)
        self._ensure_container()

    def _ensure_container(self):
        try:
            self.blob_service.create_container(self.container_name)
            print(f"Container '{self.container_name}' created.")
        except Exception:
            print(f"Container '{self.container_name}' already exists.")

    @property
    def container(self) -> ContainerClient:
        return self.blob_service.get_container_client(self.container_name)

    def upload_file(self, file_path: str, blob_name: Optional[str] = None) -> str:
        if blob_name is None:
            blob_name = os.path.basename(file_path)
        blob_client = self.container.get_blob_client(blob_name)
        with open(file_path, "rb") as f:
            blob_client.upload_blob(f, overwrite=True)
        return blob_client.url

    def upload_bytes(self, data: bytes, blob_name: str, content_type: str = "application/octet-stream") -> str:
        blob_client = self.container.get_blob_client(blob_name)
        blob_client.upload_blob(data, overwrite=True, content_settings=ContentSettings(content_type=content_type))
        return blob_client.url

    def download_blob(self, blob_name: str) -> bytes:
        blob_client = self.container.get_blob_client(blob_name)
        return blob_client.download_blob().readall()

    def download_to_file(self, blob_name: str, dest_path: str):
        data = self.download_blob(blob_name)
        os.makedirs(os.path.dirname(dest_path) or ".", exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(data)

    def list_blobs(self) -> List[dict]:
        blobs = []
        for blob in self.container.list_blobs():
            blobs.append({
                "name": blob.name,
                "size": blob.size,
                "last_modified": str(blob.last_modified),
                "content_type": blob.content_settings.content_type if blob.content_settings else "unknown",
                "url": f"{self.container.url}/{blob.name}",
            })
        return blobs

    def delete_blob(self, blob_name: str):
        blob_client = self.container.get_blob_client(blob_name)
        blob_client.delete_blob()

    def get_blob_url(self, blob_name: str) -> str:
        blob_client = self.container.get_blob_client(blob_name)
        return blob_client.url

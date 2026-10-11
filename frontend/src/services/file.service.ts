import { apiBlob } from "@/lib/api-client";

export const fileService = {
  download: (fileId: string, signal?: AbortSignal) => apiBlob(`/api/v1/files/${encodeURIComponent(fileId)}`, signal),
};

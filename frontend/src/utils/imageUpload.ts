/**
 * Upload an image file to the server and return its public URL.
 *
 * Posts a multipart/form-data request to the image upload endpoint.
 * Returns the URL string on success, or throws on failure.
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload-image/", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const err = await response.json();
      message = err.message ?? message;
    } catch {
      // ignore parse error, use default message
    }
    throw new Error(message);
  }

  const data = await response.json();
  if (!data.ok || !data.url) {
    throw new Error(data.message ?? "Upload returned an unexpected response");
  }

  return data.url;
}

/** Supported document file types for import. */
export const DOCUMENT_ACCEPT_TYPES = ".pdf,.docx,.txt,.htm,.html";

/**
 * Upload a document file (PDF, DOCX, TXT, HTML) to the server and return
 * the extracted HTML content for use in the rich text editor.
 *
 * Posts a multipart/form-data request to the document import endpoint.
 * Returns the HTML string on success, or throws on failure.
 */
export async function importDocument(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload-document/", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = `Import failed (${response.status})`;
    try {
      const err = await response.json();
      message = err.message ?? message;
    } catch {
      // ignore parse error, use default message
    }
    throw new Error(message);
  }

  const data = await response.json();
  if (!data.ok || data.html === undefined) {
    throw new Error(data.message ?? "Import returned an unexpected response");
  }

  return data.html;
}

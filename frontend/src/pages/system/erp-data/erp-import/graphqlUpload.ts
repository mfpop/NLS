import { GRAPHQL_HTTP_URL } from "@/config";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadErpSourceFile(file: File): Promise<any> {
  const UPLOAD_MUTATION = `
    mutation UploadErpSourceFile($file: Upload!) {
      uploadErpSourceFile(file: $file) {
        id
        originalName
        storedName
        fileType
        status
      }
    }
  `;

  const formData = new FormData();
  formData.append(
    "operations",
    JSON.stringify({
      query: UPLOAD_MUTATION,
      variables: { file: null },
    }),
  );
  formData.append("map", JSON.stringify({ "0": ["variables.file"] }));
  formData.append("0", file);

  const res = await fetch(GRAPHQL_HTTP_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors[0]?.message ?? "Upload failed");
  }
  return json.data?.uploadErpSourceFile;
}

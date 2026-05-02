import { useEffect, useMemo, useState } from "react";
import { useLazyQuery, useQuery } from "@apollo/client/react";
import { DOCUMENTATION_FILE_QUERY, DOCUMENTATION_FILES_QUERY } from "@/graphql";
import type {
  DocumentationContent,
  DocumentationFile,
  DocumentationFileQueryData,
  DocumentationFileQueryVars,
  DocumentationFilesQueryData,
  StatusFilter,
} from "@/pages/DocumentationCenter/documentationTypes";

export function useDocumentation() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [contentCache, setContentCache] = useState<Record<string, DocumentationContent>>({});

  const filesQuery = useQuery<DocumentationFilesQueryData>(DOCUMENTATION_FILES_QUERY);
  const [loadFile, fileQuery] = useLazyQuery<DocumentationFileQueryData, DocumentationFileQueryVars>(
    DOCUMENTATION_FILE_QUERY,
    {
      fetchPolicy: "cache-first",
    }
  );

  const files = filesQuery.data?.documentationFiles ?? [];

  useEffect(() => {
    if (selectedName || files.length === 0) {
      return;
    }

    setSelectedName(files[0].name);
  }, [files, selectedName]);

  useEffect(() => {
    if (!selectedName || contentCache[selectedName]) {
      return;
    }

    loadFile({ variables: { name: selectedName } });
  }, [contentCache, loadFile, selectedName]);

  useEffect(() => {
    if (!fileQuery.data?.documentationFile) {
      return;
    }

    const doc = fileQuery.data.documentationFile;
    setContentCache((prev) => ({ ...prev, [doc.name]: doc }));
  }, [fileQuery.data]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const file of files) {
      values.add(file.category);
    }
    return ["All", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [files]);

  const filteredFiles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return files.filter((file) => {
      if (statusFilter !== "All" && file.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== "All" && file.category !== categoryFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      const metadataMatch =
        file.name.toLowerCase().includes(term) ||
        file.category.toLowerCase().includes(term) ||
        (file.purpose ?? "").toLowerCase().includes(term);

      if (metadataMatch) {
        return true;
      }

      const cachedContent = contentCache[file.name]?.content;
      return Boolean(cachedContent && cachedContent.toLowerCase().includes(term));
    });
  }, [categoryFilter, contentCache, files, searchTerm, statusFilter]);

  const selectedFile: DocumentationFile | null = useMemo(() => {
    if (!selectedName) {
      return null;
    }

    return files.find((item) => item.name === selectedName) ?? null;
  }, [files, selectedName]);

  const selectedContent = selectedName ? contentCache[selectedName] ?? null : null;

  return {
    categories,
    categoryFilter,
    fileError: fileQuery.error,
    files,
    filesError: filesQuery.error,
    filesLoading: filesQuery.loading,
    filteredFiles,
    isFileLoading: fileQuery.loading,
    searchTerm,
    selectedContent,
    selectedFile,
    selectedName,
    setCategoryFilter,
    setSearchTerm,
    setSelectedName,
    setStatusFilter,
    statusFilter,
  };
}

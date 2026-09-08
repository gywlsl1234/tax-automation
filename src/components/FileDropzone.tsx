"use client";

import { useRef, useState } from "react";

interface FileDropzoneProps {
  label: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
}

export function FileDropzone({ label, multiple, files, onChange }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const picked = Array.from(fileList).filter((f) => f.name.endsWith(".xlsx"));
    onChange(multiple ? [...files, ...picked] : picked.slice(0, 1));
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        style={{
          border: `2px dashed ${isDragOver ? "#3b82f6" : "#ccc"}`,
          borderRadius: 8,
          padding: 20,
          textAlign: "center",
          cursor: "pointer",
          background: isDragOver ? "#eff6ff" : "#fafafa",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: "none" }}
        />
        <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
          클릭하거나 .xlsx 파일을 여기로 드래그하세요
        </p>
      </div>
      {files.length > 0 && (
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 13 }}>
          {files.map((f, idx) => (
            <li key={f.name + idx} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>{f.name}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== idx))}
                style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer" }}
              >
                제거
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

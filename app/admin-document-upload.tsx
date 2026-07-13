"use client";

import { useRef, useState } from "react";

export function AdminDocumentUpload({ locale, disabled = false, onUploaded }: { locale: "en" | "zh"; disabled?: boolean; onUploaded(fileUrl: string): void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const copy = locale === "zh"
    ? { label: "上传 PDF 文件", help: "仅接受最大 20 MB 的 PDF。上传后仍需保存内容记录，并完成核实与发布审核。", button: "上传并回填文件地址", uploading: "正在上传…", success: "文件已上传，地址已回填。发布前请再次核对文件内容。", select: "请先选择 PDF 文件。", generic: "文件上传失败，请检查对象存储配置后重试。" }
    : { label: "Upload PDF file", help: "PDF only, up to 20 MB. After upload, save the content record and complete verification before publication.", button: "Upload and use file URL", uploading: "Uploading…", success: "File uploaded and its URL was applied. Review the document again before publication.", select: "Select a PDF file first.", generic: "The document could not be uploaded. Check object storage configuration and try again." };

  const upload = async () => {
    if (!file) { setStatus("error"); setMessage(copy.select); return; }
    setStatus("uploading"); setMessage("");
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/admin/documents", { method: "POST", body });
      const result = await response.json() as { fileUrl?: string; error?: string };
      if (!response.ok || !result.fileUrl) throw new Error(result.error || copy.generic);
      onUploaded(result.fileUrl);
      setStatus("success");
      setMessage(copy.success);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : copy.generic);
    }
  };

  return <div className="document-upload">
    <label><span>{copy.label}</span><input ref={inputRef} type="file" name="file" accept="application/pdf,.pdf" disabled={disabled || status === "uploading"} onChange={event => { setFile(event.target.files?.[0] || null); setStatus("idle"); setMessage(""); }}/></label>
    <p>{copy.help}</p>
    <button className="button" type="button" disabled={disabled || status === "uploading"} onClick={() => void upload()}>{status === "uploading" ? copy.uploading : copy.button}</button>
    {message && <p className={`form-message ${status === "error" ? "error" : "success"}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
  </div>;
}

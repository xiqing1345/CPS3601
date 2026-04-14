"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { withMinDelay } from "@/lib/ui/withMinDelay";

export function MessageComposer({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Only JPEG, PNG, GIF, and WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB");
      return;
    }

    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submitMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (imageFile) {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", imageFile);

      const uploadRes = await withMinDelay(
        fetch("/api/upload", { method: "POST", body: formData }),
        420,
      );

      if (!uploadRes.ok) {
        const r = await uploadRes.json();
        setLoading(false);
        setError(r.error ?? "Image upload failed");
        return;
      }

      const { url } = await uploadRes.json();

      const msgRes = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, content: url, messageType: "image" }),
      });

      const result = await msgRes.json();
      setLoading(false);

      if (!msgRes.ok) {
        setError(result.error ?? "Could not send image");
        return;
      }

      clearImage();
      router.refresh();
      return;
    }

    const text = content.trim();
    if (!text) return;

    setLoading(true);
    setError(null);

    const res = await withMinDelay(
      fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, content: text }),
      }),
      420,
    );

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error ?? "Could not send message");
      return;
    }

    setContent("");
    router.refresh();
  }

  return (
    <>
      <LoadingOverlay visible={loading} label={imageFile ? "Uploading image" : "Sending message"} />
      <form onSubmit={submitMessage} className="space-y-2">
        {imagePreview && (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-32 rounded-lg border border-slate-200 object-cover"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-white"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {!imagePreview && (
            <input
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2"
              placeholder="Write a message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
            />
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            className="campus-btn-secondary rounded-md px-3 py-2 text-sm"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            aria-label="Attach image"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          <button
            className="campus-btn-primary rounded-md px-4 py-2"
            disabled={loading || (!imageFile && !content.trim())}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    </>
  );
}

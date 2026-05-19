'use client';

import imageCompression from 'browser-image-compression';
import { Camera, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ImageUploadFieldProps {
  /** The compressed File ready to upload, or null if nothing selected. */
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPTED_MIME_RE = /^image\//i;
// Reject anything over 25MB before even trying to compress — modern phone
// cameras hover around 5-8MB, anything bigger is likely a video frame or
// a deliberately crafted DoS attempt.
const MAX_RAW_BYTES = 25 * 1024 * 1024;

/**
 * File picker that accepts camera capture on mobile and runs the chosen
 * image through `browser-image-compression` before handing it to the
 * parent. We target <2MB so the upload completes on 3G in seconds.
 *
 * The backend re-optimizes (Sharp → webp ≤200KB) regardless — client
 * compression is a UX optimization, not a security boundary.
 */
export default function ImageUploadField({
  value,
  onChange,
  disabled,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manage the object URL lifecycle — revoke on change/unmount to avoid leaks.
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      setError(null);
      if (!file) return;

      if (!ACCEPTED_MIME_RE.test(file.type)) {
        setError('Sube una foto (JPG, PNG, WebP o HEIC).');
        return;
      }
      if (file.size > MAX_RAW_BYTES) {
        setError(
          'La foto es demasiado pesada. Toma otra con menos resolución.',
        );
        return;
      }

      setCompressing(true);
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 2000,
          useWebWorker: true,
          // Preserve the source format hint — the backend's Sharp pipeline
          // accepts JPG/PNG/WebP/HEIC and will re-encode to webp.
          fileType: file.type,
        });

        // The library returns a File but its TS type can be loose across
        // versions. Ensure we hand the parent a real File with the original
        // filename preserved (browsers default to "image.jpg" otherwise,
        // breaking the multipart filename hint).
        const out =
          compressed instanceof File &&
          compressed.name === file.name
            ? compressed
            : new File(
                [compressed as BlobPart],
                file.name || 'comprobante.jpg',
                {
                  type:
                    (compressed as Blob).type || file.type || 'image/jpeg',
                },
              );

        onChange(out);
      } catch (err) {
        // Compression failure is non-fatal — fall back to the original. The
        // backend's 10MB raw limit + magic-byte check are the real guard.
        console.warn('client compression failed, using original', err);
        onChange(file);
      } finally {
        setCompressing(false);
      }
    },
    [onChange],
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onChange]);

  if (value && previewUrl) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Vista previa del comprobante"
            className="block max-h-72 w-full object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            aria-label="Quitar foto"
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/80 text-slate-100 backdrop-blur transition hover:bg-slate-950 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="px-1 text-xs text-slate-400">
          {(value.size / 1024).toFixed(0)} KB · {value.type || 'imagen'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.03] px-4 py-6 text-center transition-colors hover:border-white/30 hover:bg-white/[0.05] ${
          disabled ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        {compressing ? (
          <Loader2
            className="h-7 w-7 animate-spin text-slate-300"
            aria-hidden
          />
        ) : (
          <Camera className="h-7 w-7 text-slate-300" aria-hidden />
        )}
        <span className="text-sm font-medium text-slate-100">
          {compressing ? 'Procesando…' : 'Toca para subir o tomar foto'}
        </span>
        <span className="text-xs text-slate-500">
          JPG, PNG, WebP o HEIC · máximo 25 MB
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={disabled || compressing}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {error && (
        <p className="px-1 text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

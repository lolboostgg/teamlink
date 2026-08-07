"use client";

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { MAX_ZOOM, MIN_ZOOM, avatarFrameStyle, clampPercent } from "@/lib/avatarFrame";

export interface AvatarFrameValue {
  avatarUrl: string;
  avatarFocusX: number;
  avatarFocusY: number;
  avatarZoom: number;
}

interface Props {
  value: AvatarFrameValue;
  onChange: (value: AvatarFrameValue) => void;
  label?: string;
  /**
   * Zoom is for teammates, whose picture also fills a tall roster card. A
   * customer's only ever shows as a small round avatar, where moving the
   * picture is the whole job and a zoom slider is one control too many.
   */
  allowZoom?: boolean;
}

// Pictures are uploaded at display resolution rather than as the old 192px
// thumbnail: the roster card draws one nearly full height. Anything larger
// than this is downscaled first, so a 12-megapixel phone photo doesn't cost
// the teammate a multi-megabyte upload for pixels nobody will see.
const MAX_EDGE = 1024;
const WEBP_QUALITY = 0.9;
const DEFAULT_AVATAR = "/avatars/default.webp";

/** Reads the picked file, downscales it if needed, and re-encodes it as WEBP. */
function prepareImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("That file isn't a readable image."));
      image.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Couldn't process that image."));
          return;
        }
        // The whole picture is kept — the crop is a viewing decision now, made
        // with the frame below and re-adjustable later, not baked into the file.
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process that image."))),
          "image/webp",
          WEBP_QUALITY,
        );
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload plus the "move your picture around inside the frame" editor every
 * social network has.
 *
 * The picture itself is stored whole; what's saved here is only where it sits
 * in the frame (focal point and zoom), which is why the same upload can fill
 * both the tall roster card and the round dashboard avatar without either one
 * lopping someone's head off.
 */
export function AvatarFrameEditor({ value, onChange, label = "Profile picture", allowZoom = true }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragFrom = useRef<{ x: number; y: number; focusX: number; focusY: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPicture = Boolean(value.avatarUrl);
  const frameStyle = avatarFrameStyle(value);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const prepared = await prepareImage(file);
      const body = new FormData();
      body.append("file", new File([prepared], "avatar.webp", { type: "image/webp" }));
      const res = await fetch("/api/avatar", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      // A new picture starts centred: the old framing belonged to the old one.
      onChange({ avatarUrl: data.url, avatarFocusX: 50, avatarFocusY: 50, avatarZoom: 100 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that image.");
    } finally {
      setUploading(false);
    }
  }

  /**
   * Turns a drag into a focal point.
   *
   * How far the picture can travel is however much of it the frame is already
   * hiding — the cover overflow, grown by the zoom. Below that there is
   * nothing to pan to, and the drag correctly does nothing.
   */
  function panTo(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragFrom.current;
    const frame = frameRef.current?.getBoundingClientRect();
    const image = imageRef.current;
    if (!start || !frame || !image?.naturalWidth || !image.naturalHeight) return;

    const zoom = value.avatarZoom / 100;
    const cover = Math.max(frame.width / image.naturalWidth, frame.height / image.naturalHeight) * zoom;
    const hiddenX = image.naturalWidth * cover - frame.width;
    const hiddenY = image.naturalHeight * cover - frame.height;

    onChange({
      ...value,
      avatarFocusX:
        hiddenX > 1 ? clampPercent(start.focusX - ((event.clientX - start.x) / hiddenX) * 100) : start.focusX,
      avatarFocusY:
        hiddenY > 1 ? clampPercent(start.focusY - ((event.clientY - start.y) / hiddenY) * 100) : start.focusY,
    });
  }

  return (
    <div className="form-row">
      {label && <label>{label}</label>}

      <div className="avatar-frame">
        <div
          ref={frameRef}
          // Without zoom the picture is only ever an avatar, so the stage is
          // the shape it will actually be seen in rather than a roster card.
          className={`avatar-frame__stage${allowZoom ? "" : " avatar-frame__stage--square"}${hasPicture ? " is-draggable" : ""}`}
          onPointerDown={(event) => {
            if (!hasPicture) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragFrom.current = {
              x: event.clientX,
              y: event.clientY,
              focusX: value.avatarFocusX,
              focusY: value.avatarFocusY,
            };
          }}
          onPointerMove={(event) => {
            if (dragFrom.current) panTo(event);
          }}
          onPointerUp={() => {
            dragFrom.current = null;
          }}
          onPointerCancel={() => {
            dragFrom.current = null;
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imageRef} src={value.avatarUrl || DEFAULT_AVATAR} alt="" style={frameStyle} draggable={false} />
          {hasPicture && (
            <span className="avatar-frame__hint">
              <i className="fa-solid fa-up-down-left-right" aria-hidden="true" /> Drag to reposition
            </span>
          )}
        </div>

        <div className="avatar-frame__side">
          <div className="avatar-frame__preview" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.avatarUrl || DEFAULT_AVATAR} alt="" style={frameStyle} />
            <span>Avatar</span>
          </div>

          {allowZoom && (
            <label className="avatar-frame__zoom">
              <span>Zoom</span>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={5}
                value={value.avatarZoom}
                disabled={!hasPicture}
                onChange={(event) => onChange({ ...value, avatarZoom: Number(event.target.value) })}
                style={{ "--zoom-pct": `${((value.avatarZoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%` } as CSSProperties}
              />
            </label>
          )}

          <div
            className={`avatar-frame__drop${dragOver ? " is-dragover" : ""}`}
            role="button"
            tabIndex={0}
            aria-label="Upload profile picture"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              void handleFile(event.dataTransfer.files?.[0]);
            }}
          >
            <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
            <span>
              {uploading ? "Uploading..." : hasPicture ? "Replace picture" : "Drag & drop or click to upload"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="avatar-upload__input"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
          </div>

          {hasPicture && (
            <button
              type="button"
              className="avatar-upload__remove"
              onClick={() => onChange({ avatarUrl: "", avatarFocusX: 50, avatarFocusY: 50, avatarZoom: 100 })}
            >
              <i className="fa-solid fa-trash" aria-hidden="true" /> Remove picture
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="form-row__error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

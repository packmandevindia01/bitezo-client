import { ImagePlus, Upload } from "lucide-react";

interface ImageUploadPanelProps {
  title?: string;
  preview?: string;
  onSelect: (file: File | null) => void;
}

const ImageUploadPanel = ({
  title = "Image",
  preview,
  onSelect,
}: ImageUploadPanelProps) => {
  return (
    <div className="w-full shrink-0 md:w-56">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
        {title}
      </p>

      <label
        className="
          flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3
          rounded-2xl border border-dashed border-[#49293e]/25 bg-[#49293e]/[0.03]
          p-6 text-center transition hover:border-[#49293e]/45 hover:bg-[#49293e]/[0.05]
        "
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
        />

        {preview ? (
          <img src={preview} alt="Preview" className="h-36 w-full rounded-xl object-cover shadow-sm" />
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#49293e] shadow-sm">
              <ImagePlus size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Upload image</p>
              <p className="text-xs text-gray-500">PNG, JPG, or WEBP</p>
            </div>
          </>
        )}

        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#49293e] shadow-sm">
          <Upload size={14} />
          Choose File
        </span>
      </label>
    </div>
  );
};

export default ImageUploadPanel;

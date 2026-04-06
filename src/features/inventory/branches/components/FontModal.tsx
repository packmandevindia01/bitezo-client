import { Modal, Button } from "../../../../components/common";
import { FONT_FAMILIES, FONT_STYLES, FONT_SIZES } from "../utils/lineHelpers";
import type { FontModalState } from "../types";

interface Props {
  state: FontModalState;
  sampleText: string;
  onChange: (patch: Partial<FontModalState["temp"]>) => void;
  onApply: () => void;
  onClose: () => void;
}

const FontModal = ({ state, sampleText, onChange, onApply, onClose }: Props) => (
  <Modal
    isOpen={state.open}
    onClose={onClose}
    title="Font Picker"
    footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={onApply}>Apply</Button>
      </>
    }
  >
    <div className="grid grid-cols-3 gap-4 mb-4">

      {/* Font Family */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Font</label>
        <div className="border border-gray-200 rounded-lg h-40 overflow-y-auto">
          {FONT_FAMILIES.map((f) => (
            <div
              key={f}
              onClick={() => onChange({ fontFamily: f })}
              className={`px-3 py-1.5 text-sm cursor-pointer transition ${
                state.temp.fontFamily === f
                  ? "bg-[#49293e] text-white"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
              style={{ fontFamily: f }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Style */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Style</label>
        <div className="border border-gray-200 rounded-lg h-40 overflow-y-auto">
          {FONT_STYLES.map((s) => (
            <div
              key={s}
              onClick={() => onChange({ fontStyle: s })}
              className={`px-3 py-1.5 text-sm cursor-pointer transition ${
                state.temp.fontStyle === s
                  ? "bg-[#49293e] text-white"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
              style={{
                fontWeight: s.includes("Bold") ? "bold" : "normal",
                fontStyle: s.includes("Italic") ? "italic" : "normal",
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
        <div className="border border-gray-200 rounded-lg h-40 overflow-y-auto">
          {FONT_SIZES.map((sz) => (
            <div
              key={sz}
              onClick={() => onChange({ fontSize: sz })}
              className={`px-3 py-1.5 text-sm cursor-pointer transition ${
                state.temp.fontSize === sz
                  ? "bg-[#49293e] text-white"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              {sz}
            </div>
          ))}
        </div>
      </div>

    </div>

    {/* Sample */}
    <div className="border border-gray-100 bg-gray-50 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">Sample</p>
      <p
        style={{
          fontFamily: state.temp.fontFamily,
          fontWeight: state.temp.fontStyle.includes("Bold") ? "bold" : "normal",
          fontStyle: state.temp.fontStyle.includes("Italic") ? "italic" : "normal",
          fontSize: `${state.temp.fontSize}px`,
        }}
      >
        {sampleText}
      </p>
    </div>
  </Modal>
);

export default FontModal;

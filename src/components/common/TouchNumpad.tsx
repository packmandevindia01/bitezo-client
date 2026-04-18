import React from "react";
import { X, Delete } from "lucide-react";
import Button from "./Button";

interface TouchNumpadProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onClose?: () => void;
  title?: string;
  isPassword?: boolean;
}

const TouchNumpad: React.FC<TouchNumpadProps> = ({
  value,
  onChange,
  onSubmit,
  onClose,
  title = "ENTER Value",
  isPassword = false,
}) => {
  const handleNumClick = (num: string) => {
    onChange(value + num);
  };

  const handleClear = () => {
    onChange("");
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const buttons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Del"];

  return (
    <div className="flex flex-col w-full max-w-sm mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#49293e] text-white px-4 py-3 flex justify-between items-center">
        <h3 className="font-semibold text-sm tracking-widest uppercase">{title}</h3>
        {onClose && (
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Input Display */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <input
          type={isPassword ? "password" : "text"}
          value={value}
          readOnly
          className="w-full text-center text-3xl font-bold tracking-[0.2em] bg-white border border-gray-300 rounded-lg py-3 outline-none text-gray-800"
        />
      </div>

      {/* Numpad Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {buttons.map((btn) => {
            if (btn === "Clear") {
              return (
                <button
                  key={btn}
                  onClick={handleClear}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-lg py-4 rounded-xl transition active:scale-95 border border-gray-200"
                >
                  {btn}
                </button>
              );
            }
            if (btn === "Del") {
              return (
                <button
                  key={btn}
                  onClick={handleDelete}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-lg py-4 flex items-center justify-center rounded-xl transition active:scale-95 border border-gray-200"
                >
                  <Delete size={22} />
                </button>
              );
            }
            return (
              <button
                key={btn}
                onClick={() => handleNumClick(btn)}
                className="bg-white hover:bg-gray-50 text-gray-800 font-bold text-2xl py-4 rounded-xl transition active:scale-95 border border-gray-200 shadow-sm"
              >
                {btn}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Button
            size="lg"
            variant="primary"
            onClick={onSubmit}
            className="w-full rounded-xl py-4 text-lg font-bold"
          >
            Submit
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={onClose || (() => onChange(""))}
            className="w-full rounded-xl py-4 text-lg font-bold text-gray-600"
          >
            {onClose ? "Close" : "Reset"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TouchNumpad;

interface PosMobileCartButtonProps {
  itemCount: number;
  onOpen: () => void;
}

/** Phone-width only: floating button that opens the cart, with the item count (moved out of PosTerminalPage). */
export const PosMobileCartButton = ({ itemCount, onOpen }: PosMobileCartButtonProps) => (
  <button
    onClick={onOpen}
    className="md:hidden absolute bottom-4 right-4 z-40 bg-[#ff9500] hover:bg-[#e68600] text-white p-4 rounded-full shadow-2xl transition-transform active:scale-95 flex items-center justify-center"
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
    {itemCount > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#fcf9fb]">
        {itemCount}
      </span>
    )}
  </button>
);

import { formatAmount } from "../../../../../utils/formatters";

const ReceiptDummyBody = () => {
  return (
    <>
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Sample POS Item Header */}
      <div className="flex justify-between text-[10px] font-semibold mb-1">
        <span>SNo</span>
        <span>Name</span>
        <span>Qty</span>
        <span>Price</span>
      </div>

      {/* Sample POS Item Row */}
      <div className="flex justify-between text-[10px]">
        <span>1</span>
        <span className="shrink-0">ITEM 123</span>
        <span>1</span>
        <span>{formatAmount(1)}</span>
      </div>

      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Financial Breakdown */}
      <div className="text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>Sub Total</span>
          <span>{formatAmount(1)}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT</span>
          <span>{formatAmount(0)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Net Amount</span>
          <span>{formatAmount(1)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-400 my-2" />
    </>
  );
};

export default ReceiptDummyBody;

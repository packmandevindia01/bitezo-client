import { useRef, useMemo, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { PosCategory, PosProduct } from "../../types";
import PosProductCard from "./PosProductCard";

interface PosProductGridProps {
  products: PosProduct[];
  activeCategory?: PosCategory;
  search: string;
  onAdd: (productId: number) => void;
}

const PosProductGrid = ({
  products,
  onAdd,
}: PosProductGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const updateColumns = () => {
      if (!parentRef.current) return;
      const width = parentRef.current.offsetWidth;
      if (width > 1200) setColumns(4);
      else if (width > 900) setColumns(3);
      else if (width > 600) setColumns(2);
      else setColumns(1);

    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < products.length; i += columns) {
      result.push(products.slice(i, i + columns));
    }
    return result;
  }, [products, columns]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, 
    overscan: 5,
  });

  return (
    <section className="flex-1 bg-transparent overflow-hidden">
      <div
        ref={parentRef}
        className="h-full overflow-y-auto scrollbar-hide"
      >
        {products.length === 0 ? (
          <div className="rounded-[40px] border-2 border-dashed border-slate-100 bg-white px-6 py-20 text-center shadow-sm">
            <p className="text-xl font-bold text-slate-300">No items matched this search.</p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.index}
                className="grid gap-6 xl:gap-10"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  paddingBottom: "40px"
                }}
              >
                {rows[virtualRow.index].map((product) => (
                  <PosProductCard 
                    key={product.id} 
                    product={product} 
                    onAdd={onAdd} 
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PosProductGrid;

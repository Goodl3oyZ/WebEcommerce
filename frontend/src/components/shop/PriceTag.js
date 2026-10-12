import classNames from "classnames";
import { formatTHB, toPrice } from "@/lib/format";

/**
 * Product price. `from` marks a starting price when variants differ.
 * There is no sale-price data in the catalogue, so no strike-through prices.
 */
export default function PriceTag({ value, from = false, size = "md", className }) {
  const price = toPrice(value);
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-2xl sm:text-3xl" };
  if (price == null) {
    return <span className={classNames("text-sm text-fg-subtle", className)}>ยังไม่เปิดขาย</span>;
  }
  return (
    <span className={classNames("font-semibold tabular-nums text-fg", sizes[size], className)}>
      {from && <span className="mr-1 text-[0.8em] font-normal text-fg-subtle">เริ่มต้น</span>}
      {formatTHB(price)}
    </span>
  );
}

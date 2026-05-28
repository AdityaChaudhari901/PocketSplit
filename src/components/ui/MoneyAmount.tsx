import { AppText } from "@/components/ui/AppText";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode } from "@/types/domain";

interface MoneyAmountProps {
  amountMinor: number;
  currency?: CurrencyCode;
  size?: "hero" | "title" | "subtitle" | "body";
  muted?: boolean;
}

export const MoneyAmount = ({ amountMinor, currency = "INR", size = "title", muted }: MoneyAmountProps) => (
  <AppText variant={size} muted={muted}>
    {formatMoney(amountMinor, currency)}
  </AppText>
);

import { useEffect, useState } from "react";
import { apiUrl } from "./api";

const SYMBOLS: Record<string, string> = { RUB: "₽", USD: "$", EUR: "€" };


export function usePrice(): string {
  const [label, setLabel] = useState("…");
  useEffect(() => {
fetch(apiUrl("/api/config"))
      .then((r) => r.json())
      .then((c: { price: number; currency: string }) =>
        setLabel(`${c.price.toLocaleString("ru-RU")} ${SYMBOLS[c.currency] ?? c.currency}`)
      )
      .catch(() => setLabel(""));
  }, []);
  return label;
}

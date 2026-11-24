import { useEffect, useState } from "react";

const SYMBOLS: Record<string, string> = { RUB: "₽", USD: "$", EUR: "€" };

/** Цена приходит с сервера, чтобы сайт и платёж всегда совпадали. */
export function usePrice(): string {
  const [label, setLabel] = useState("…");
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { price: number; currency: string }) =>
        setLabel(`${c.price.toLocaleString("ru-RU")} ${SYMBOLS[c.currency] ?? c.currency}`)
      )
      .catch(() => setLabel(""));
  }, []);
  return label;
}

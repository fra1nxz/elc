import { FormEvent, useState } from "react";
import { usePrice } from "../usePrice";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Pay() {
  const price = usePrice();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Введите корректный email, например name@example.com");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const { url } = (await r.json()) as { url: string };
      window.location.href = url; // переход на страницу платёжного провайдера
    } catch {
      setError("Не удалось начать оплату. Попробуйте ещё раз.");
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <form className="page" onSubmit={submit} noValidate>
        <h2>Оплата доступа</h2>
        <p className="muted">Стоимость: <strong className="plain">{price}</strong>, один раз. Активационный код придёт на указанную почту.</p>
        <label htmlFor="email">Ваш email</label>
        <input id="email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
        <div className="err" role="alert">{error}</div>
        <button className="btn" disabled={busy}>{busy ? "Переходим к оплате…" : "Перейти к оплате"}</button>
      </form>
    </div>
  );
}

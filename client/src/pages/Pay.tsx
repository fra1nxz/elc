
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { usePrice } from "../usePrice";
import { apiUrl } from "../api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Pay() {
  const price = usePrice();
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();

    const value = email.trim();

    if (!EMAIL_RE.test(value)) {
      setError("Введите корректный email, например name@example.com");
      return;
    }

    if (!accepted) {
      setError("Подтвердите согласие с документами.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      const r = await fetch(apiUrl("/api/checkout"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value }),
      });

      if (!r.ok) throw new Error(String(r.status));

      const { url } = (await r.json()) as { url: string };
      window.location.href = url;
    } catch {
      setError("Не удалось начать оформление заказа. Попробуйте ещё раз.");
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <form className="page" onSubmit={submit} noValidate>
        <h2>Оплата доступа</h2>

        <p className="muted">
          Стоимость: <strong className="plain">{price}</strong>, единоразово.
          Подписки и регулярных списаний нет.
        </p>

        <p className="muted">
          После подтверждения оплаты активационный код отобразится
          на странице результата. Email используется для оформления
          и сопровождения заказа.
        </p>

        <label htmlFor="email">Ваш email</label>

        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
        />

        <label className="legal-consent">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            Я принимаю условия{" "}
            <Link to="/agreement">Пользовательского соглашения</Link>
            {" "}и ознакомлен(а) с{" "}
            <Link to="/privacy">Политикой конфиденциальности</Link>.
          </span>
        </label>

        <div className="err" role="alert">{error}</div>

        <button className="btn" disabled={busy}>
          {busy ? "Переходим к оформлению…" : "Перейти к оформлению"}
        </button>
      </form>
    </div>
  );
}

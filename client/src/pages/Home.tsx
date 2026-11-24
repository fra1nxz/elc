import { Link } from "react-router-dom";
import { about, contacts, features } from "../content";
import { usePrice } from "../usePrice";

export default function Home() {
  const price = usePrice();
  return (
    <div className="wrap">
      <div className="hero rise">
        <h1>Elc</h1>
        <p className="lead">Краткое описание приложения: что оно делает и зачем оно нужно. Один доступ — навсегда, без подписки.</p>
        <Link className="btn" to="/pay">Купить доступ</Link>
      </div>

      <section id="about">
        <h2>О приложении</h2>
        <div className="cols">
          {about.map((a) => (
            <p key={a.title}><strong>{a.title}.</strong> {a.text}</p>
          ))}
        </div>
      </section>

      <section id="features">
        <h2>Возможности</h2>
        <div className="feat">
          {features.map((f) => (
            <div key={f.title}><h3>{f.title}</h3><p>{f.text}</p></div>
          ))}
        </div>
      </section>

      <section id="buy">
        <h2>Покупка</h2>
        <div className="buy">
          <div>
            <div className="price">{price}</div>
            <ul>
              <li>Оплата один раз, подписки нет</li>
              <li>Код появится на сайте и придёт на email</li>
              <li>Один код — одно устройство</li>
            </ul>
          </div>
          <Link className="btn" to="/pay">Купить доступ</Link>
        </div>
      </section>

      <section id="contacts" className="contacts">
        <h2>Контакты</h2>
        <p className="muted">Вопросы по покупке и сброс привязки устройства — через поддержку.</p>
        <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
        <a href={contacts.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>
        <a href={contacts.vk} target="_blank" rel="noopener noreferrer">VK</a>
      </section>
    </div>
  );
}

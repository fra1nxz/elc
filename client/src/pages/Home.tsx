
import { Link } from "react-router-dom";
import { about, contacts, features } from "../content";
import { usePrice } from "../usePrice";

export default function Home() {
  const price = usePrice();

  return (
    <div className="wrap">
      <div className="hero rise">
        <h1>Elc</h1>

        <p className="lead">
          «Ёлка» — новогоднее приложение для macOS 12 и новее.
          Внутри — пиксельная комната с ёлкой, камином и маленьким помощником.
        </p>

        <Link className="btn" to="/pay">Купить доступ</Link>
      </div>

      <section id="about">
        <h2>О приложении</h2>

        <div className="cols">
          {about.map((item) => (
            <p key={item.title}>
              <strong>{item.title}.</strong> {item.text}
            </p>
          ))}
        </div>
      </section>

      <section id="features">
        <h2>Возможности</h2>

        <div className="feat">
          {features.map((feature) => (
            <div key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="buy">
        <h2>Покупка</h2>

        <div className="buy">
          <div>
            <div className="price">{price}</div>

            <ul>
              <li>Единоразовая оплата, без подписки</li>
              <li>Активационный код отображается после подтверждения оплаты</li>
              <li>Один код привязывается к одному устройству</li>
              <li>Повторная активация на том же устройстве разрешена</li>
            </ul>
          </div>

          <Link className="btn" to="/pay">Купить доступ</Link>
        </div>
      </section>

      <section id="contacts" className="contacts">
        <h2>Контакты</h2>

        <p className="muted">
          Вопросы по покупке, активации и сбросу привязки устройства —
          через службу поддержки.
        </p>

        <a
          href={contacts.telegram}
          target="_blank"
          rel="noopener noreferrer"
        >
          Написать в Telegram: @zxelegia
        </a>
      </section>
    </div>
  );
}

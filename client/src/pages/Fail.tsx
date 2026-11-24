import { Link } from "react-router-dom";

export default function Fail() {
  return (
    <div className="wrap"><div className="page">
      <h2>Оплата не прошла</h2>
      <p className="muted lead-sm">Деньги не списаны, код не выдан. Проверьте данные карты и попробуйте ещё раз.</p>
      <Link className="btn" to="/pay">Повторить попытку</Link>
    </div></div>
  );
}

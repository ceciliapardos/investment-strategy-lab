import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container">
        <p>
          <strong>Investment Strategy Lab</strong> · Proyecto académico con fines educativos.
          Analiza comportamientos históricos: no es asesoramiento financiero y las
          rentabilidades pasadas no garantizan rentabilidades futuras.
        </p>
        <p className="footer__source">
          Datos de mercado: Yahoo Finance (vía yfinance). Pueden tener retraso o estar incompletos.
        </p>
      </div>
    </footer>
  )
}

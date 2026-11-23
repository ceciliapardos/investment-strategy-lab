# Guion de la presentación final · Investment Strategy Lab

**Duración total:** unos 4 min 55 s (295 s), dentro del límite de 5 minutos.
**Cómo abrirla:** abrid `presentacion-final/index.html` en el navegador. No hace falta servidor ni conexión, salvo para la Live Demo y la tipografía web; sin conexión se usa una fuente del sistema.
**Controles:**

| Acción | Tecla |
|---|---|
| Avanzar | → o espacio |
| Retroceder | ← |
| Primera y última diapositiva | Home / End |
| Pantalla completa | F |

Al mover el ratón aparecen los botones de control.

> El reparto entre ponentes es una **propuesta**; lo decide el equipo.

## Antes de empezar (checklist)

1. **Despertar la Live Demo unos minutos antes.** Abrid https://investment-strategy-lab.onrender.com: el servidor gratuito tarda alrededor de un minuto en arrancar tras 15 minutos sin uso.
2. **Preparar el navegador de la demo.**
   - Las estrategias se guardan en el `localStorage` de cada navegador.
   - Strategy Comparison necesita al menos dos estrategias completas guardadas en ese navegador.
   - Cost Analysis también trabaja sobre las estrategias guardadas.
   - Creadlas antes en el mismo navegador que usaréis para presentar. Por ejemplo, las cuatro de las capturas: Global 70/30 con 300 €/mes, Global 100 % renta variable, Mixta 60/40 y Concentrada España.
3. **Abrir la presentación en pantalla completa** (tecla F).

---

## 01 · Portada · 15 s

- **Ponente propuesta:** Cecilia.
- **Mensaje principal:** somos un laboratorio de simulación histórica, no un asesor.
- **Guion:** «Somos Cecilia, Almudena y Covadonga. Hemos construido Investment Strategy Lab, una aplicación que simula estrategias de inversión con datos históricos reales. Queremos ver cuánto cambia el resultado según dónde y cómo inviertes. No predice ni recomienda: analiza el pasado».

## 02 · Nuestra primera pregunta era mala · 30 s

- **Ponente propuesta:** Cecilia.
- **Mensaje principal:** el primer planteamiento daba la respuesta por construcción, y decidimos cambiarlo.
- **Guion:** «Empezamos con "Coste Invisible": dos productos con la misma rentabilidad y distinto coste. Pero así el barato gana siempre; el resultado estaba decidido antes de empezar. Un inversor paga más cuando espera algo a cambio, y eso no aparecía. Así que cambiamos la pregunta: ¿cuánto cambian los costes de intermediación y la frecuencia la eficiencia real de una estrategia, mirando también rentabilidad, riesgo y *benchmark*?».

## 03 · Qué construimos · 25 s

- **Ponente propuesta:** Cecilia.
- **Mensaje principal:** cinco módulos y métricas estándar; el TER y el coste del intermediario van separados.
- **Guion:** «La aplicación tiene cinco módulos. En Explore Markets se estudian activos reales. En Strategy Builder se construyen estrategias. Strategy Comparison las compara en euros frente a un índice. Cost Analysis aplica las tarifas oficiales de 10 perfiles de bancos y brokers. Medimos CAGR, volatilidad, máxima caída y Sharpe. Y separamos el TER, que ya está en el precio, del coste del intermediario. Las capturas son reales y la aplicación está publicada».

## 04 · La máquina también se equivocó · 45 s

- **Ponente propuesta:** Almudena.
- **Mensaje principal:** la IA cometió errores plausibles; los detectamos con fuentes primarias y los registramos.
- **Guion:**
  - «Registramos 31 incidencias de la IA; estas son las tres mejor contrastadas.
  - Uno: asignó un TER del 0,20 % a acciones como Tesla, y una acción no tiene gestora. Lo comprobamos con la guía de ETF de la CNMV.
  - Dos: afirmó que los tests estaban "superados al 100 %", pero tres de los diez no podían fallar.
  - Tres: llamó "precio histórico" a un precio ajustado por dividendos, por un valor por defecto de `yfinance`.
  - El patrón siempre fue el mismo: salida de la IA, duda, fuente primaria y decisión humana».

## 05 · Tres decisiones · 40 s

- **Ponente propuesta:** Almudena.
- **Mensaje principal:** las decisiones fueron humanas, y la más clara fue retirar la IA del producto.
- **Guion:** «Tomamos tres decisiones clave.
  - La primera fue reformular la pregunta.
  - La segunda, separar el cálculo determinista y validar fase a fase: ninguna afirmación de la IA valía sin una prueba que pudiera fallar.
  - La tercera fue retirar el AI Strategy Analyst. Lo construimos y lo probamos, pero el modelo local iba a unos 1,96 *tokens* por segundo. En público exigiría una API de pago o un modelo de varios gigas, y además repetía lo que la aplicación ya explica de forma verificable. Así que lo descartamos.

  Usar IA como método no obliga a meterla en el producto».

## 06 · Cómo controlamos la máquina · 25 s

- **Ponente propuesta:** Covadonga.
- **Mensaje principal:** método por fases y una cadena de datos trazable.
- **Guion:** «Cada fase empezaba con criterios de aceptación escritos y terminaba con tests y una comprobación nuestra en la interfaz. Cada cifra sigue una cadena: fuente externa, limpieza, cálculo, API, interfaz y tests. El texto generado por IA ya no forma parte del producto. Todo está documentado en el repositorio».

## 07 · Qué descubrimos · 45 s

- **Ponente propuesta:** Covadonga.
- **Mensaje principal:** el coste depende de la combinación de frecuencia, tarifa, horizonte, estrategia y riesgo.
- **Guion:**
  - «Con la misma cartera y 242 compras en diez años, las comisiones de compra van de 252 € con MyInvestor a 8.712 € con CaixaBank. Pesa la estructura de la tarifa, no su apariencia.
  - Aportar cada mes ganó por el momento de entrada; con CaixaBank, el orden se invirtió.
  - La cartera concentrada superó al índice, pero con más caída y con sesgo de selección. No es una recomendación.
  - Al acortar el horizonte, cambian las métricas.
  - Y en una simulación hipotética, la rotación alta resta desde un 2,5 % hasta un 37 % según el broker.
  - Conclusión: no existe "el coste" en abstracto. Todo son resultados históricos de un periodo concreto, no predicciones».

## 08 · Qué aprendimos · 20 s

- **Ponente propuesta:** Cecilia.
- **Mensaje principal:** cuestionar a la IA fue el verdadero valor.
- **Guion:** «Aprendimos a separar el TER del coste del intermediario y a no fiarnos de un número plausible. El valor no estuvo en dejar que la IA decidiera, sino en saber cuándo cuestionarla. El código y la aplicación son públicos».

## 09 · Demo · 50 s

- **Ponente propuesta:** Almudena (al teclado) y Covadonga (narra).
- **Mensaje principal:** la herramienta funciona con datos reales.
- **Recorrido sugerido:**
  1. **Explore Markets (10 s):** buscar IWDA.AS y señalar CAGR, volatilidad, máxima caída y TER.
  2. **Strategy Comparison (20 s):** comparar las estrategias guardadas frente al S&P 500 TR a 10 años.
  3. **Cost Analysis (20 s):** elegir un intermediario y enseñar el «antes y después de costes».
- **Plan B si la demo tarda en cargar:** volver a la diapositiva 03, que muestra capturas reales, y explicar el recorrido sobre ellas.

---

## Qué datos aparecen y de dónde salen

- **Diapositiva 07.** Todas las cifras proceden de `Experimentos y resultados.md` y de `Resultados investigación/`: resultados congelados entre el 18/11/2016 y el 18/11/2026, con el grado de certeza de cada cifra.
  - **E1, comisiones de compra.** CaixaBank 8.712 €, Bankinter 4.840 €, Santander 4.840 €, ING 772 €, MyInvestor 252 €. Columna `coste_compras` del CSV.
  - **E5.** Escenario hipotético, con certeza MEDIA. Se presenta siempre como simulación hipotética.
- **Capturas** (`assets/`). Hechas en la Live Demo el 23/11/2026. Muestran valores en vivo con fechas hasta hoy, así que **no coinciden** con la ventana congelada de los experimentos. Úsense como imagen del producto, no como cifras.

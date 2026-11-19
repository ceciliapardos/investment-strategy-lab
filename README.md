# Investment Strategy Lab

Aplicación web educativa para inversores principiantes. Permite:
- explorar activos;
- construir estrategias de inversión;
- simular cómo se habrían comportado en el pasado frente a un índice de referencia;
- ver cuánto cuestan con distintos intermediarios.

Es un **laboratorio de simulación histórica**: no predice el futuro ni da recomendaciones de inversión.

## Objetivo financiero

El proyecto estudia la inversión minorista a largo plazo y el peso real de la intermediación.

**Pregunta de investigación:**

> ¿Hasta qué punto los costes de intermediación y la frecuencia de operativa pueden cambiar la eficiencia real de una estrategia de inversión a largo plazo para un inversor minorista, una vez considerados rentabilidad, riesgo y *benchmark*, en simulaciones históricas?

La aplicación distingue dos tipos de coste:
- **Costes del producto (TER):** ya están descontados en el precio del ETF o fondo, así que no se restan otra vez.
- **Costes del intermediario:** comisiones, custodia y divisa. Se calculan operación a operación con tarifas oficiales.

Los experimentos realizados con la aplicación y sus resultados están en `Experimentos y resultados.md`.

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **News** | Titulares recientes de mercados, economía, bancos centrales y empresas (Google News RSS, BCE y Fed), con enlace a la fuente. |
| **Explore Markets** | Acciones, ETFs, índices, criptomonedas, futuros y fondos: rentabilidad, CAGR, volatilidad, máxima caída, ratio de Sharpe y TER. Incluye **Mi lista** (favoritos guardados en el navegador). |
| **Strategy Builder** | Varias estrategias con activos, pesos, capital inicial y **aportaciones periódicas** opcionales (mensuales, trimestrales o anuales). |
| **Strategy Comparison** | Backtest histórico en euros (comprar y mantener, con aportaciones) en un periodo común. Métricas de riesgo (volatilidad, máxima caída, Sharpe) sobre la rentabilidad ponderada por el tiempo (TWR), y **benchmark** opcional: S&P 500 Total Return o MSCI World (proxy ETF). |
| **Cost Analysis** | Costes de intermediación con tarifas oficiales de 10 perfiles (bancos tradicionales y brokers digitales) o costes personalizados: una comisión por cada compra, custodia, divisa y coste de salida. El TER no se resta dos veces. |
| **Cost Sensitivity** (dentro de Cost Analysis: «Sensibilidad a costes de operativa (rotación)») | Simulación educativa e hipotética, separada del backtest, de cómo las comisiones de compraventa de la rotación erosionan el interés compuesto. Usa perfiles de rotación con supuestos visibles. No incluye la custodia del intermediario (sí la incluye el análisis histórico). |

## Metodología

- **Análisis histórico, no predictivo.** Los resultados describen cómo se habría comportado una estrategia en un periodo pasado; no anticipan el futuro.
- **No es asesoramiento financiero.** La aplicación no recomienda productos, intermediarios ni estrategias.
- **Cálculo determinista y trazable:**
  - precios ajustados por dividendos y splits, convertidos a euros con tipos de cambio diarios;
  - fechas comunes sin rellenar datos;
  - fórmulas documentadas y probadas con tests de resultado conocido.
- **Fuentes:**
  - Yahoo Finance mediante `yfinance` (no oficial);
  - tarifas oficiales de cada intermediario, con fecha de consulta;
  - noticias de Google News RSS, BCE y Fed.
  
  Todas están documentadas en `Datos y fuentes.md`; la cadena completa de cada cifra, en `Cadena de datos y reproducibilidad.md`.

## Arquitectura

```text
frontend/  React 18 + Vite 5 + React Router + Recharts      → http://localhost:5173
backend/   Python 3.11 + FastAPI + pandas                    → http://localhost:8000
  analytics/   cálculos financieros puros (métricas, cartera, costes, sensibilidad)
  services/    orquestación (datos de mercado, backtest, costes, noticias)
  routers/     API REST: markets, news, comparison, costs
  data/        tarifas de intermediarios versionadas (JSON, con fuente y fecha)
```

## Instalación

Requisitos: **Python 3.11** y **Node.js 18 o superior**. No hace falta ninguna API key, ningún servicio de pago ni ningún modelo de IA local.

```bash
git clone https://github.com/ceciliapardos/investment-strategy-lab.git
cd investment-strategy-lab
```

```bash
cd backend
python -m pip install -r requirements.txt
```

```bash
cd frontend
npm install
```

## Ejecutar la aplicación

En Windows, con doble clic (cada uno abre su propia ventana):

1. `start_backend.bat`: arranca la API en `http://localhost:8000`.
2. `start_frontend.bat`: arranca la web en `http://localhost:5173`.

O desde la terminal:

```bash
cd backend && python -m uvicorn main:app --reload --port 8000
```

```bash
cd frontend && npm run dev
```

Las estrategias y los favoritos se guardan en el navegador (`localStorage`): no hay cuentas ni base de datos.

## Tests

Los tests del backend necesitan además las dependencias de desarrollo. Los E2E usan Microsoft Edge (canal `msedge` de Playwright) con la aplicación arrancada.

```bash
cd backend && python -m pip install -r requirements-dev.txt
```

```bash
cd backend && python -m pytest
```

```bash
cd backend && python -m pytest -m integration
```

```bash
cd frontend && npm test
```

```bash
cd frontend && npm run test:e2e
```

| Comando | Qué ejecuta |
|---|---|
| `python -m pytest` | Tests deterministas, sin red |
| `python -m pytest -m integration` | Tests con Yahoo Finance y feeds reales |
| `npm test` | Tests unitarios del frontend |
| `npm run test:e2e` | Playwright, con la aplicación arrancada |

## Desarrollo asistido por IA

La IA ha sido parte central del **método** de desarrollo, no del producto final:

| Herramienta | Uso |
|---|---|
| **Antigravity** | Primeras fases: prototipado, generación inicial de código, ejecución y testing |
| **Claude Code** | Desde la auditoría del código heredado: arquitectura, desarrollo, debugging, testing, investigación y documentación, fase a fase y con aprobación humana |
| **Obsidian** | Documentación, decisiones, versiones, fuentes, bitácora y registro de errores de la IA. **Obsidian no es una IA**: es la herramienta donde se guarda el rastro del proyecto |
| **LM Studio + Qwen3 8B** | Usados experimentalmente para un módulo «AI Strategy Analyst» que interpretaba los resultados. **No forman parte del producto final ni son un requisito para ejecutarlo** |

**AI Strategy Analyst.** Se construyó de forma experimental y se retiró después por una decisión metodológica y de producto:
- era lento con el modelo local;
- obligaba a cada usuario a instalar y mantener un modelo de IA;
- en la nube dependía de una API de pago;
- aportaba poco frente a los cálculos deterministas que la aplicación ya ofrece.

La justificación está en `Decisiones.md` (D80), y sus *prompts* se conservan como rastro en `Histórico/AI Strategy Analyst/`.

Todas las decisiones finales son del equipo humano. Los errores de las herramientas de IA, cómo se detectaron y contra qué fuente se comprobaron están documentados en `Errores de la IA.md`.

## Documentación del proyecto

La documentación del proceso está en la raíz y forma un vault de Obsidian.

| Archivo | Contenido |
|---|---|
| `Bitácora final - Investment Strategy Lab.md` / `.docx` | Bitácora de entrega: decisiones, errores de la IA, control del proceso, experimentos y aprendizajes |
| `Idea del Proyecto.md` | Evolución del proyecto, desde «Coste Invisible» hasta Investment Strategy Lab |
| `Investigación principal.md` | Pregunta, hipótesis, literatura y limitaciones |
| `Experimentos y resultados.md` | Cinco experimentos con hipótesis previas, resultados congelados y grado de certeza |
| `Resultados investigación/` | Script reproducible y respuestas completas de la API (JSON y CSV) |
| `Cadena de datos y reproducibilidad.md` | De dónde sale cada cifra: fuente, transformación, archivo, *endpoint* y test |
| `Decisiones.md` · `Versiones.md` · `Fases del proyecto.md` | Registro de decisiones (D1–D81), versiones (V0.1–V0.11) y fases |
| `Errores de la IA.md` | Auditoría de 31 errores de las herramientas de IA |
| `Datos y fuentes.md` | Fuentes de datos y tarifas, con URL y fecha de consulta |
| `Acceptance tests.md` · `Checklist entrega Luis.md` | Pruebas por fase, validación humana y requisitos de la entrega |
| `Bitácora.md` | Registro cronológico detallado del proceso |
| `Claude.md` | Instrucciones de trabajo dadas a Claude Code |

## Limitaciones

- **Simulación histórica:** los resultados dependen del periodo elegido. Rentabilidades pasadas no garantizan resultados futuros.
- **Fuentes externas:** los datos de mercado proceden de fuentes no oficiales y pueden tener errores o retrasos.
- **Tarifas sujetas a cambios:** se consultaron en una fecha concreta, indicada en la app, y se aplican a todo el periodo histórico. Consulta siempre la tarifa oficial vigente.
- **No incluido:** impuestos, cánones de bolsa, spreads ni rentabilidad ponderada por el dinero (XIRR).
- **Riesgo antes de costes:** volatilidad, máxima caída y Sharpe se calculan antes de costes de intermediación; Cost Analysis muestra el resultado neto en euros.

## Proyecto académico

Proyecto académico con fines educativos, desarrollado en la asignatura de Análisis de Servicios Financieros (ICADE E2A), dentro del trabajo «El carril abierto». Equipo: Cecilia Pardos, Almudena López y Covadonga López-Belmonte.

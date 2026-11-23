# Investment Strategy Lab

> **Live Demo → https://investment-strategy-lab.onrender.com**
>
> Funciona en el navegador, sin instalar nada. Alojamiento gratuito: si nadie la ha usado en los últimos 15 minutos, la primera consulta de datos puede tardar alrededor de un minuto mientras el servidor arranca.

## Qué es

Investment Strategy Lab es una aplicación web educativa para inversores principiantes. Permite:
- explorar activos reales;
- construir estrategias de inversión a largo plazo;
- simular cómo se habrían comportado en el pasado frente a un índice de referencia;
- ver cuánto habrían costado con distintos bancos y brokers.

Es un **laboratorio de simulación histórica**: no predice el futuro ni da recomendaciones de inversión.

**Objetivo financiero.** El proyecto estudia la inversión minorista a largo plazo y el peso real de la intermediación. Distingue dos tipos de coste:
- **los costes del producto (TER):** ya están descontados en el precio del ETF o fondo;
- **los costes del intermediario:** comisiones, custodia y divisa, calculados operación a operación con tarifas oficiales.

## Research question

> ¿Hasta qué punto los costes de intermediación y la frecuencia de operativa pueden cambiar la eficiencia real de una estrategia de inversión a largo plazo para un inversor minorista, una vez considerados rentabilidad, riesgo y *benchmark*, en simulaciones históricas?

- Investigación (pregunta, hipótesis, literatura y limitaciones): [Investigación principal.md](Investigaci%C3%B3n%20principal.md)
- Cinco experimentos con hipótesis previas y resultados congelados: [Experimentos y resultados.md](Experimentos%20y%20resultados.md)

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **News** | Titulares de mercados, economía, bancos centrales y empresas (Google News RSS, BCE y Reserva Federal), con enlace a la fuente original |
| **Explore Markets** | Acciones, ETF, índices, criptomonedas, futuros y fondos: rentabilidad, CAGR, volatilidad, máxima caída, ratio de Sharpe y TER |
| **Mi lista (favoritos)** | Activos guardados en Explore Markets, en el propio navegador |
| **Strategy Builder** | Varias estrategias con activos, pesos, capital inicial y aportaciones periódicas (mensuales, trimestrales o anuales) |
| **Strategy Comparison** | Backtest histórico en euros (comprar y mantener, con aportaciones) en un periodo común |
| **Benchmark** | Referencia opcional en Strategy Comparison: S&P 500 Total Return o MSCI World (proxy ETF), en el mismo periodo |
| **Métricas de riesgo** | Volatilidad, máxima caída y Sharpe (tasa libre de riesgo del 0 %, declarada), sobre la rentabilidad ponderada por el tiempo (TWR) |
| **Cost Analysis** | Costes de intermediación con tarifas oficiales de 10 perfiles de bancos y brokers que operan en España, o costes personalizados. El TER no se resta dos veces |
| **Cost Sensitivity** | «Sensibilidad a costes de operativa (rotación)», dentro de Cost Analysis: simulación **hipotética**, separada del backtest, de cómo las comisiones de compraventa erosionan el interés compuesto. No incluye la custodia del intermediario |

## Arquitectura

```text
Navegador ──► Frontend React + Vite (sitio estático) ──► API FastAPI (Python) ──► Proveedores externos
                                                         ├─ analytics/  cálculos financieros puros      ├─ Yahoo Finance (yfinance)
                                                         ├─ services/   backtest, costes, noticias      ├─ Google News RSS, BCE, Fed
                                                         └─ data/       tarifas oficiales versionadas
```

- **Producción:** dos servicios gratuitos de [Render](https://render.com), descritos en [`render.yaml`](render.yaml).
  - Frontend: https://investment-strategy-lab.onrender.com
  - API: https://investment-strategy-lab-api.onrender.com (estado en `/api/health`)
- **Configuración:**
  - el frontend recibe la dirección de la API en `VITE_API_BASE_URL`;
  - la API solo acepta peticiones de los orígenes de `ALLOWED_ORIGINS` (CORS) y de `localhost`.
- **Local:** sin variables. El frontend llama a `/api/...` y el servidor de Vite las reenvía a `http://localhost:8000`.

## Fuentes de datos

- **Mercado:** precios diarios ajustados por dividendos y *splits*, tipos de cambio y benchmarks de Yahoo Finance, a través de `yfinance` (no oficial).
- **Tarifas:** documentos oficiales de cada intermediario, con URL y fecha de consulta, en [`backend/data/broker_fees.json`](backend/data/broker_fees.json).
- **Noticias:** Google News RSS y los *feeds* oficiales del BCE y de la Reserva Federal.

Detalle completo en [Datos y fuentes.md](Datos%20y%20fuentes.md).

## Reproducibilidad

- [Cadena de datos y reproducibilidad.md](Cadena%20de%20datos%20y%20reproducibilidad.md): de dónde sale cada cifra (fuente, transformación, archivo, *endpoint* y test), en local y en producción.
- [Resultados investigación/](Resultados%20investigaci%C3%B3n/): script de los experimentos y respuestas completas de la API (JSON y CSV).

## Errores de IA y control humano

- [Errores de la IA.md](Errores%20de%20la%20IA.md): auditoría de 31 errores de las herramientas de IA, cómo se detectaron y contra qué fuente primaria se comprobaron.
- [Decisiones.md](Decisiones.md): registro de decisiones del equipo.
- [Bitácora final](Bit%C3%A1cora%20final%20-%20Investment%20Strategy%20Lab.md): documento de entrega.

## Ejecución local

**Requisitos:** [Python 3.11](https://www.python.org/downloads/), [Node.js 18 o superior](https://nodejs.org/) y Git. No hace falta ninguna API key, ningún servicio de pago ni ningún modelo de IA.

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/ceciliapardos/investment-strategy-lab.git
   ```

   ```bash
   cd investment-strategy-lab
   ```

2. **Instalar el backend:**

   ```bash
   cd backend
   ```

   ```bash
   python -m pip install -r requirements.txt
   ```

3. **Iniciar el backend.** Déjalo abierto en esta terminal.

   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

   La API queda en `http://localhost:8000`. Puedes comprobarla en `http://localhost:8000/api/health`.

4. **Instalar el frontend.** Abre otra terminal en la carpeta del repositorio:

   ```bash
   cd frontend
   ```

   ```bash
   npm install
   ```

5. **Iniciar el frontend:**

   ```bash
   npm run dev
   ```

   Abre `http://localhost:5173` en el navegador.

**En Windows** también puedes arrancar todo con doble clic en `start_backend.bat` y `start_frontend.bat`, después de instalar las dependencias.

Las estrategias y los favoritos se guardan en el navegador (`localStorage`): no hay cuentas ni base de datos.

## Tests

Instala primero las dependencias de desarrollo del backend:

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
| `python -m pytest` | Tests deterministas del backend, sin red |
| `python -m pytest -m integration` | Tests con Yahoo Finance y *feeds* reales (requiere internet) |
| `npm test` | Tests unitarios del frontend (Vitest) |
| `npm run test:e2e` | Pruebas en navegador (Playwright con Microsoft Edge), con la aplicación local arrancada |

## Desarrollo asistido por IA

La IA ha sido parte central del **método** de desarrollo, no del producto final.

| Herramienta | Uso |
|---|---|
| **Antigravity** | Primeras fases: prototipado, generación inicial de código, ejecución y pruebas |
| **Claude Code** | Desde la auditoría del código heredado: arquitectura, desarrollo, *debugging*, tests, investigación, documentación y despliegue, fase a fase y con aprobación humana |
| **Obsidian** | Documentación, decisiones, versiones, fuentes, bitácora y registro de errores de la IA. **No es una IA**: es la herramienta donde se guarda el rastro del proyecto |
| **LM Studio + Qwen3 8B** | Usados experimentalmente para un módulo «AI Strategy Analyst», que después se descartó. **No forman parte del producto ni son un requisito** |

**El AI Strategy Analyst** se construyó de forma experimental y se retiró por una decisión metodológica y de producto:
- era lento con el modelo local;
- obligaba a cada usuario a instalar un modelo de IA;
- en la nube dependía de una API de pago;
- aportaba poco frente a los cálculos deterministas que la aplicación ya ofrece.

La justificación está en [Decisiones.md](Decisiones.md) (D80), y sus *prompts* se conservan en [Histórico/AI Strategy Analyst/](Hist%C3%B3rico/AI%20Strategy%20Analyst/). Todas las decisiones finales son del equipo humano.

## Documentación del proyecto

La documentación del proceso está en la raíz del repositorio y forma un vault de Obsidian.

| Archivo | Contenido |
|---|---|
| `Bitácora final - Investment Strategy Lab.md` / `.docx` | Bitácora de entrega |
| `Idea del Proyecto.md` | Evolución: de «Coste Invisible» a Investment Strategy Lab |
| `Investigación principal.md` · `Experimentos y resultados.md` | Investigación y experimentos |
| `Cadena de datos y reproducibilidad.md` · `Datos y fuentes.md` | Trazabilidad de los datos y fuentes |
| `Decisiones.md` · `Versiones.md` · `Fases del proyecto.md` | Decisiones, versiones y fases |
| `Errores de la IA.md` | Auditoría de errores de las herramientas de IA |
| `Acceptance tests.md` · `Checklist entrega Luis.md` | Pruebas por fase, validación humana y requisitos de la entrega |
| `Bitácora.md` | Registro cronológico detallado |
| `Claude.md` | Instrucciones de trabajo dadas a Claude Code |

## Presentation

La presentación final (5 minutos) está en [`presentacion-final/`](presentacion-final/).
- **Cómo abrirla:** abrid `index.html` en el navegador; no necesita servidor.
- **Controles:** ← → o espacio para avanzar y retroceder, Home / End, y F para pantalla completa.
- **Guion:** con el reparto y los tiempos, en `presentacion-final/guion-presentacion.md`.

## Limitaciones

- **Simulación histórica:** los resultados dependen del periodo elegido.
- **Fuentes externas:** los datos de mercado proceden de una fuente no oficial y pueden tener errores o retrasos.
- **Tarifas:** se consultaron en una fecha concreta y se aplican a todo el periodo histórico.
- **No incluido:** impuestos, cánones, spreads ni rentabilidad ponderada por el dinero (XIRR).
- **Riesgo antes de costes:** volatilidad, máxima caída y Sharpe se calculan antes de costes de intermediación.
- **Versión pública (plan gratuito):**
  - **Arranque lento:** el servidor se duerme tras 15 minutos sin uso y tarda alrededor de un minuto en despertar.
  - **News incompleto:** Google News no responde a las peticiones desde el servidor público. Allí, News muestra solo los *feeds* oficiales del BCE y de la Reserva Federal, y las categorías temáticas y el buscador no están disponibles. En local funcionan todas las fuentes.

## Autoras

Cecilia Pardos · Almudena López · Covadonga López-Belmonte

## Aviso académico

Proyecto académico con fines educativos, desarrollado en la asignatura de Análisis de Servicios Financieros (ICADE E2A), dentro del trabajo «El carril abierto».
- Utiliza datos históricos y **no constituye asesoramiento financiero**: no recomienda productos, intermediarios ni estrategias.
- **Rentabilidades pasadas no garantizan resultados futuros.**

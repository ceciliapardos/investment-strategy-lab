# Fases del proyecto — Roadmap

**Leyenda:**
- ✅ Aprobada por el equipo
- 🟦 Completada técnicamente, pendiente de validación humana
- ⬜ Pendiente

Una fase solo pasa a ✅ cuando el equipo la prueba y escribe **APROBADO**.

```text
✅ Fase 0 — Auditoría
✅ Fase 1 — Estabilización
✅ Fase 2 — Explore Markets + News
✅ Fase 3 — Strategy Builder
✅ Fase 4 — Strategy Comparison
✅ Fase 5 — Cost Analysis + aportaciones periódicas
🔁 Fase 6 — Experimento AI Strategy Analyst  ← construido y posteriormente DESCARTADO por decisión humana (Fase 8.1)
🟦 Fase 7 — Mejoras según el feedback del profesor  ← completada técnicamente, pendiente de validación humana
🟦 Fase 8 — Investigación, trazabilidad y auditoría documental  ← documentación completada, pendiente de revisión del equipo
🟦 Fase 8.1 — Cierre funcional  ← corrección de Cost Sensitivity, retirada de AI Strategy Analyst y README; pendiente de revisión
🟦 Fase 9 — Investigación empírica con la app  ← 5 experimentos ejecutados; pendiente de revisión y validación manual del equipo
✅ Fase 9.1 — Validación metodológica  ← resultados congelados; comprobaciones P1–P6 validadas por el equipo
🟦 Fase 10 — Bitácora final (.md y .docx) y publicación en GitHub  ← pendiente de revisión del equipo
🟦 Fase 11 — Publicación web (Live Demo)  ← desplegada en Render y verificada en producción (V1.0); News parcial en producción
⬜ Presentación
```

🔁 = descartada por decisión del equipo (se conserva como historia).

Detalle técnico de cada versión en [[Versiones]]; decisiones en [[Decisiones]]; pruebas en [[Acceptance tests]]; relato cronológico en [[Bitácora]].

---

## ✅ Fase 0 — Auditoría (2026-11-11)
- **Objetivo:** entender el estado real del código heredado de Antigravity antes de tocar nada.
- **Funcionalidades:** ninguna. Fue un informe que comparaba lo que funcionaba con lo que estaba solo documentado, con problemas detectados y propuesta de arquitectura.
- **Estado:** aprobada. Conclusión: estabilizar en lugar de rehacer.

## ✅ Fase 1 — Estabilización (V0.2, 2026-11-11)
- **Objetivo:** corregir los errores de base antes de construir encima.
- **Funcionalidades:**
  - backend en capas, con funciones financieras puras y caché;
  - clasificación correcta de activos, tickers inválidos tratados como error y TER con unidades verificadas;
  - tests en tres niveles y entorno reproducible;
  - navegación con los 6 módulos.
- **Estado:** aprobada.

## ✅ Fase 2 — Explore Markets + News (V0.3, 2026-11-11)
- **Objetivo:** un módulo de mercados sólido y educativo, y una sección de actualidad financiera.
- **Funcionalidades:**
  - 6 tipos de activo, periodos y fechas personalizadas, todo con datos diarios;
  - rentabilidad, CAGR, volatilidad y máxima caída, con explicaciones;
  - gráfico profesional, nuevo sistema visual y mascota Capi;
  - News con Google News RSS y feeds del BCE y la Fed: portada, categorías y buscador.
- **Estado:** aprobada.

## ✅ Fase 3 — Strategy Builder (V0.4, 2026-11-12)
- **Objetivo:** que un principiante construya una o varias estrategias simuladas (activos, pesos y capital inicial) listas para compararlas después.
- **Funcionalidades:**
  - varias estrategias (crear, renombrar, duplicar, eliminar y cambiar entre ellas);
  - capital inicial validado;
  - activos añadidos con el buscador de Explore Markets;
  - pesos objetivo hasta 100 % con medidor y gráfico donut;
  - persistencia en el navegador.
- **Estado:** aprobada.

## ✅ Fase 4 — Strategy Comparison (V0.5, 2026-11-12)
- **Objetivo:** responder cómo se habrían comportado históricamente varias estrategias si se hubieran puesto en marcha en un mismo periodo. Es retrospectivo, no predictivo.
- **Funcionalidades:**
  - comparar de 2 a 6 estrategias del Strategy Builder;
  - periodos de 1, 3, 5 y 10 años, máximo común o fechas personalizadas;
  - backtest buy & hold en euros (con conversión de divisas) sobre el **periodo común** real de todos los activos;
  - evolución de cada 100 € invertidos, caída desde máximos, tabla comparativa sin rankings y composición inicial frente a final;
  - estados vacíos e inválidos explicados, con enlace al Strategy Builder.
- **Estado:** aprobada.

## ✅ Fase 5 — Cost Analysis (V0.6–V0.7, 2026-11-12)
- **Objetivo:** que el usuario vea cuánto cuesta implementar cada estrategia y cómo cambian los resultados según el intermediario, sin decirle cuál usar.
- **Funcionalidades:**
  - de 1 a 6 estrategias sobre el **mismo backtest** que Strategy Comparison (mismas fechas, precios en euros);
  - escenarios: sin costes de intermediación, ING Broker Naranja, MyInvestor, Trade Republic (tarifas oficiales con fecha y fuente) y costes personalizados;
  - comisiones de compra y venta (fija, porcentual, mínimo, máximo, tope por importe, por mercado o por instrumento), cambio de divisa solo si aplica, custodia con su periodicidad real y mantenimiento;
  - «Costes durante la inversión» separados del «Coste estimado de salida»;
  - resultado antes y después de costes del intermediario, en € y % del capital, barras desde 0 €, desglose por estrategia y una estrategia bajo todos los intermediarios (sin ranking);
  - TER como información, ya reflejado en el precio: **no se resta dos veces**.
- **Ampliación 5.1 (V0.7), antes de la aprobación:**
  - **Aportaciones periódicas** opcionales por activo (mensual, trimestral, anual) en Strategy Builder.
  - **Strategy Comparison:** las aportaciones se simulan como flujos externos, con rentabilidad ponderada por el tiempo (TWR) y una tabla de dinero aportado frente a resultado.
  - **Cost Analysis:** una operación con su comisión por cada aportación.
  - **10 perfiles tarifarios:** Santander, CaixaBank, Bankinter, ING, BBVA (2), MyInvestor, Trade Republic y Revolut (2), agrupados en bancos tradicionales y brokers digitales, sin intermediario por defecto.
- **Estado:** ✅ aprobada por el equipo tras la validación humana (V0.7).

## 🟦 Fase 6 — AI Strategy Analyst (V0.8–V0.9, 2026-11-12)
- **Objetivo:** explicar los resultados ya calculados (diferencias, riesgos, trade-offs) sin cruzar a asesoramiento financiero. **Interpretar, no calcular.**
- **Funcionalidades:**
  - estrategias, periodo e intermediario: los mismos que ya eligió el usuario en Comparison y Cost Analysis, modificables;
  - perfil educativo opcional: horizonte, tolerancia a caídas y prioridad;
  - botón «Generar análisis» (la API solo se llama bajo demanda) y caché de la sesión;
  - tarjetas con las cifras de la aplicación, más el texto de la IA: resumen, trade-offs, riesgo, costes, aportaciones, perfil, notas por estrategia, conceptos y limitaciones;
  - capa de IA desacoplada: proveedor (Claude, mediante el SDK oficial de Anthropic), prompt versionado, input estructurado y validación con guardrails;
  - estados de carga, error con reintento, sin estrategias, sin comparación previa y sin API configurada.
- **Ampliación 6.1 (V0.9), antes de la aprobación:** el proveedor pasa de la API de Anthropic (de pago, con API key) a **LM Studio local** (gratuito, sin claves).
  - estados nuevos: LM Studio no iniciado, sin modelo cargado y modelo configurado no encontrado;
  - proyecto preparado para GitHub: .gitignore, README.md y .bat sin rutas personales.
- **Estado anterior:** 🟦 completada técnicamente, pendiente de validación humana con un modelo real en LM Studio.
- **Estado final:** 🔁 **Fase 6 — experimento AI Strategy Analyst: construido y posteriormente descartado por decisión humana** (Fase 8.1, [[Decisiones]] D80). Motivos: rendimiento, valor incremental limitado, distribución, coste y simplicidad.

## 🟦 Fase 7 — Mejoras según el feedback del profesor (V0.10, 2026-11-18)
- **Origen:** revisión del equipo y feedback del profesor Luis (métricas de riesgo, benchmark y sensibilidad a costes), más favoritos en Explore Markets.
- **Funcionalidades (incrementales, sin rediseñar módulos):**
  - **Ratio de Sharpe** (tasa libre de riesgo 0 %, indicada) en Explore Markets y Strategy Comparison;
  - **benchmark opcional** en Strategy Comparison: S&P 500 Total Return (índice) o MSCI World (proxy ETF), en el mismo periodo, en el gráfico y en una sección separada;
  - **sensibilidad a costes** en Cost Analysis: simulación educativa con cuatro perfiles de rotación, separada del resultado histórico real;
  - **«Mi lista»** (favoritos) en Explore Markets, guardada en el navegador.
- **Estado:** 🟦 **completada técnicamente, pendiente de validación humana.**

## 🟦 Fase 8 — Investigación principal, trazabilidad, decisiones y auditoría de errores de IA (2026-11-18)
- **Objetivo:** reforzar el ancla financiera y el control sobre la máquina, sin tocar el código.
- **Resultados:**
  - [[Investigación principal]];
  - [[Cadena de datos y reproducibilidad]];
  - [[Errores de la IA]] rehecho (30 casos clasificados A/B/C);
  - [[Decisiones]] Parte XII;
  - [[Checklist entrega Luis]];
  - auditoría de [[Datos y fuentes]], [[Idea del Proyecto]], [[Bitácora]] y `Claude.md`.
- **No incluye:** la bitácora final de 2–4 páginas, PDF, PPTX ni cambios de código.
- **Estado:** 🟦 pendiente de revisión del equipo.

## 🟦 Fase 8.1 — Cierre funcional (V0.11, 2026-11-18)
- **Cost Sensitivity:** la alerta de la Fase 8 era un error real (las ventas usaban la regla de compra). Se corrigió con 2 tests de regresión (D81).
- **AI Strategy Analyst:** retirado del producto por decisión del equipo (D80). Se eliminaron código, ruta, navegación, endpoints, configuración de LM Studio y tests.
- **README y `.gitignore`:** preparados para una publicación futura, sin crear el repositorio.
- **Estado:** 🟦 pendiente de revisión del equipo.

## 🟦 Fase 9 — Investigación empírica (2026-11-19)
- **Objetivo:** usar la app (V0.11) como instrumento para contrastar la pregunta de investigación. Sin cambios de código.
- **Experimentos:**
  1. intermediarios;
  2. frecuencia de aportaciones;
  3. estrategias frente al benchmark;
  4. horizonte;
  5. sensibilidad a la rotación.
- **Resultados:** [[Experimentos y resultados]]; datos en `Resultados investigación/` (script reproducible, JSON y CSV).
- **Estado:** 🟦 pendiente de revisión del equipo y de la validación manual ([[Acceptance tests]], «Validación manual durante experimentos»).

## 🟦 Fase 11 — Publicación web y distribución pública (V1.0, 2026-11-23)
- **Objetivo:** dos formas de usar el proyecto:
  - una **Live Demo** pública, sin instalar nada: https://investment-strategy-lab.onrender.com;
  - el **repositorio** público: https://github.com/ceciliapardos/investment-strategy-lab.
- **Hosting:** Render, plan gratuito y sin tarjeta, con un servicio web para la API FastAPI y un sitio estático para el frontend (`render.yaml`; [[Decisiones]] D82).
- **Cambios, solo de despliegue:** `VITE_API_BASE_URL` en el frontend, `ALLOWED_ORIGINS` (CORS) en el backend y un mensaje claro cuando el servidor gratuito está arrancando. Sin cambios en la lógica financiera.
- **Verificación en producción:** [[Acceptance tests]], «Fase 11».
- **Limitaciones:**
  - el servidor tarda alrededor de un minuto en arrancar tras 15 minutos sin uso;
  - Google News no responde desde el servidor, así que News solo muestra el BCE y la Fed.
- **Estado:** 🟦 desplegada y verificada por Claude Code; pendiente de revisión del equipo.

> News, prevista inicialmente como Fase 6, se adelantó a la Fase 2 por ser independiente del resto (ver [[Bitácora]] §13).

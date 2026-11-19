# Investment Strategy Lab — Idea del proyecto

## Pregunta central

**Pregunta de investigación** (Fase 8, pendiente de aprobación del equipo; desarrollo en [[Investigación principal]]):

> ¿Hasta qué punto los costes de intermediación y la frecuencia de operativa pueden cambiar la eficiencia real de una estrategia de inversión a largo plazo para un inversor minorista, una vez considerados rentabilidad, riesgo y benchmark?

**Pregunta de producto** (desde la primera reorientación; sigue en la Home):

> ¿Qué estrategia de inversión es realmente más eficiente cuando tenemos en cuenta rentabilidad, riesgo, diversificación y todos sus costes?

**Cómo se relacionan:**
- La pregunta de producto describe para qué sirve la aplicación.
- La de investigación acota qué estudiamos con ella: el efecto de los costes de intermediación y de la frecuencia de operativa.

## Cómo hemos llegado aquí (cronología completa, sin ocultar los cambios de rumbo)

| Etapa | Enfoque | Por qué cambió |
|---|---|---|
| 1. «Coste Invisible» | Comparar dos productos con la misma rentabilidad bruta y distintos costes (propuesta inicial con IA) | La conclusión era trivial: el más barato siempre gana (ver [[Bitácora]] §1–2, [[Errores de la IA]] E10) |
| 2. Comparador simple en Streamlit | Comparar **dos estrategias** (A vs B) con rentabilidad, riesgo, diversificación y costes; construido con Antigravity | Arquitectura frágil y funcionalidades declaradas corregidas que fallaban ([[Bitácora]] §3–4, E09, E11) |
| 3. Reorientación técnica (V0.1) | React + FastAPI, solo Home y Explore Markets; todavía con el nombre «Coste Invisible» | La auditoría de la Fase 0 detectó errores de base y documentación que no coincidía con el código ([[Bitácora]] §11) |
| 4. Investment Strategy Lab | Laboratorio educativo con **N estrategias** y **6 módulos** para inversores principiantes; trabajo por fases con Claude Code y aprobación humana | — |
| 4a. Estabilización (V0.2) | Base corregida; universo limitado a acciones y ETFs | Aprobada. El equipo amplía el universo a 6 tipos de activo |
| 4b. Mercados + News (V0.3) | Explore Markets completo y News (adelantada) | Aprobada |
| 4c. Strategy Builder (V0.4) | El usuario construye sus estrategias | Aprobada |
| 4d. Strategy Comparison (V0.5) | Backtest histórico en euros, periodo común | Aprobada |
| 4e. Cost Analysis (V0.6–V0.7) | Tarifas oficiales; ampliado con aportaciones periódicas y 10 perfiles | Aprobada |
| 4f. AI Strategy Analyst (V0.8–V0.9) | Experimento: primero con la API de pago de Claude; después el equipo decide pasar a un modelo **local** (LM Studio) | 🔁 **Descartado por decisión humana** en la Fase 8.1: lento, poco valor añadido, difícil de distribuir y de pago en la nube (D80) |
| 5. Evolución posterior (V0.10) | Feedback del profesor: Sharpe, benchmark y sensibilidad a costes; favoritos | 🟦 Pendiente de validación |
| 6. Fase 8 | Investigación principal, cadena de datos, auditoría de errores de IA y de la documentación | En revisión por el equipo |
| 7. Fase 8.1 (V0.11) | Cierre funcional: corrección de Cost Sensitivity, retirada de AI Strategy Analyst, README | En revisión por el equipo. **Producto final: 5 módulos** |

## Herramientas utilizadas

| Herramienta | Tipo | Uso | Observaciones |
|---|---|---|---|
| **Antigravity** | Agente de IA para programar | Prototipo en Streamlit y V0.1 (React + FastAPI) | Dejó de ser la herramienta principal tras la V0.1: afirmaciones de estado no verificadas, tests que no podían fallar y documentación que no coincidía con el código ([[Errores de la IA]] E02, E09, E12). Se reservó para usos diferenciados ([[Bitácora]] §9) |
| **Claude Code** | Agente de IA para programar | Desde la Fase 0: auditoría, arquitectura, implementación, debugging, tests, investigación y documentación, siempre fase a fase | También cometió errores, documentados en [[Errores de la IA]] (E05, E14–E16, E21–E27, E31) |
| **LM Studio** + Qwen3 8B (qwen/qwen3-8b) | IA generativa local | Uso **experimental** como motor del AI Strategy Analyst (Fase 6.1) | **No forma parte del producto final**: el módulo se descartó en la Fase 8.1 (D80) |

**IA como método ≠ IA en el producto.** La IA ha sido central en cómo se construyó el proyecto (Antigravity y Claude Code). El producto final no tiene ninguna funcionalidad generativa: todas sus cifras son deterministas y trazables.
| **Obsidian** | **No es una IA** | Memoria y trazabilidad del proyecto: decisiones, versiones, fuentes, errores y bitácora | La documentación debe reflejar el estado real del código |
| Equipo humano | — | Define el alcance, decide, valida y aprueba cada fase | Las decisiones finales son suyas |

## Enfoque actual

Aplicación web **educativa y de simulación histórica** para personas que quieren empezar a invertir su patrimonio a largo plazo pero no tienen conocimientos financieros avanzados.

El usuario podrá:

- explorar acciones, ETFs, índices, criptomonedas, futuros y fondos con datos reales;
- informarse con noticias financieras recientes enlazadas a su fuente original;
- construir varias estrategias (A, B, C, D…) con distintos activos y pesos;
- ver cómo se **habrían** comportado históricamente en un periodo elegido;
- comparar rentabilidad, riesgo (volatilidad, máximo drawdown), concentración y costes;
- distinguir costes del producto (TER) y costes del intermediario (comisiones, custodia, divisa);
- compararse con un índice de referencia y ver cómo la frecuencia de operativa erosiona el interés compuesto;
- ~~recibir explicaciones asistidas por IA de los resultados ya calculados~~ (retirado en la Fase 8.1, D80).

### Principios

1. **Retrospectivo, no predictivo.** Se muestra "cómo se habría comportado", nunca "cuánto ganará". Rentabilidades pasadas no garantizan rentabilidades futuras.
2. **No se inventan datos.** Si un dato (p. ej. el TER) no existe en la fuente, se muestra "No disponible".
3. **No es asesoramiento financiero** ni ejecuta inversiones reales. La aplicación explica y compara; no recomienda.
4. **Comprensible para principiantes:** explicaciones breves y contextuales, sin convertir la app en un curso.
5. **Estética fintech profesional** y arquitectura simple, robusta y explicable.

## Módulos

| # | Módulo | Estado (2026-11-18) |
|---|---|---|
| 1 | News / Market News | Disponible (V0.3) |
| 2 | Explore Markets | Disponible: métricas, fechas y 6 tipos de activo (V0.3); Sharpe (rf 0 %) y «Mi lista» (V0.10, pendiente de validación) |
| 3 | Strategy Builder | Disponible — módulo central (V0.4, aprobada); aportaciones periódicas opcionales por activo (V0.7) |
| 4 | Strategy Comparison | Disponible: backtest buy & hold en euros, periodo común (V0.5, aprobada); con aportaciones, rentabilidad TWR y dinero aportado aparte (V0.7); Sharpe y benchmark opcional S&P 500 TR / MSCI World proxy (V0.10, pendiente de validación) |
| 5 | Cost Analysis | Disponible: 10 perfiles tarifarios oficiales (bancos tradicionales y brokers digitales) y costes personalizados; una comisión por cada compra, incluidas las aportaciones; antes/después y salida aparte; TER informativo sin doble cómputo (V0.6–V0.7, aprobada); sensibilidad a costes con perfiles de rotación hipotéticos (V0.10); ventas y compras con su propia comisión (V0.11) |
| ~~6~~ | ~~AI Strategy Analyst~~ | 🔁 **Retirado del producto** (V0.11): experimento construido en las Fases 6–6.1 y descartado por decisión del equipo (D80). Rastro en `Histórico/AI Strategy Analyst/` |

Orden de desarrollo y estado de cada fase: ver [[Fases del proyecto]] (roadmap) y [[Versiones]] (detalle técnico).

## Fuera del alcance (por ahora)

- robo-advisor y recomendaciones personalizadas de inversión;
- rebalanceo automático (las aportaciones periódicas sí se incorporaron en la Fase 5.1);
- rentabilidad ponderada por el dinero (MWR / XIRR);
- fiscalidad e impuestos; spreads, slippage e impacto de mercado;
- rankings de «mejor broker» u optimización del intermediario;
- simulaciones Monte Carlo y predicciones;
- optimización automática de carteras;
- tipos de cambio entre divisas, opciones y fondos monetarios como activos analizables.

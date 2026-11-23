# Instrucciones para Claude Code

Antes de modificar nada, lee la documentación actual del proyecto en los archivos Markdown de esta carpeta y revisa el código existente.

## Forma de trabajar

1. No asumas que lo documentado coincide con el código: compruébalo.
    
2. Antes de cada cambio importante, explica qué vas a modificar y por qué.
    
3. Trabaja módulo por módulo.
    
4. No avances al siguiente módulo hasta que el equipo haya revisado y aprobado el anterior.
    
5. Después de cada fase, indica:
    
    - qué has cambiado;
        
    - archivos modificados;
        
    - decisiones tomadas;
        
    - supuestos financieros;
        
    - tests realizados;
        
    - limitaciones;
        
    - documentación que debe actualizarse.
        
6. No inventes datos, costes ni conceptos financieros.
    
7. Si detectas un posible error de IA, señálalo como “posible error para revisión humana”, pero no lo añadas automáticamente a `Errores de la IA.md` (salvo que el equipo lo autorice expresamente, como en la Fase 8).
    
8. Las decisiones finales pertenecen al equipo humano.
    
9. La aplicación debe analizar y simular estrategias históricas; no debe presentar resultados históricos como predicciones futuras.
    
10. Mantén una estética fintech profesional y una arquitectura simple, robusta y explicable.
    

## Reglas prácticas

- No cierres ni dupliques los procesos que el equipo tenga arrancados (backend, frontend u otros programas). Prueba contra ellos.
- AI Strategy Analyst **se retiró del producto** (D80): no lo reintroduzcas ni añadas dependencias de IA o de servicios de pago sin una decisión del equipo.
- Tests:
  - backend: `python -m pytest` desde `backend/` (deterministas), `-m integration` (red), `-m e2e` (app arrancada);
  - frontend: `npm test` (Vitest) y `npm run test:e2e` (Playwright).
- Nunca pongas claves, rutas personales ni datos del equipo en el código o en peticiones externas.

## Estado general

Se actualiza en cada fase; el detalle está en [[Fases del proyecto]].
- **Fases 0–5:** aprobadas.
- **Fase 6:** experimento AI Strategy Analyst, descartado por decisión del equipo.
- **Fases 7, 8 y 8.1** (cierre funcional, V0.11): pendientes de revisión.
- **Producto final:** 5 módulos.
- **Publicado:** https://github.com/ceciliapardos/investment-strategy-lab · Live Demo https://investment-strategy-lab.onrender.com (Render gratuito, `render.yaml`; D82).

## Documentación

Lee especialmente:

[Idea del proyecto]
[Investigación principal]
[Decisiones]
[Versiones]
[Fases del proyecto]
[Acceptance tests]
[Datos y fuentes]
[Cadena de datos y reproducibilidad]
[Errores de la IA]
[Checklist entrega Luis]
[Bitácora]

La documentación de Obsidian debe reflejar el estado real del proyecto y evolucionar con él.

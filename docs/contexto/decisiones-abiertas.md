---
icon: lucide/circle-help
---

# Decisiones abiertas

Cada una trae un valor por defecto para no bloquear el trabajo.

1. **Qué hacen las startups.** Por defecto: operadores que publican circuitos privados del catálogo y ven sus reservas.
2. **Rol de admin K'Plan.** Por defecto: sí existe (aprueba organizaciones y paradas, maneja cupones de K'Plan y lugares destacados).
3. **Quién certifica a los guías y publica los horarios de grupo.** La app dice "guía certificado" pero no hay un flujo. Por defecto: en el MVP el portal sólo muestra los horarios; en la fase 2 la alcaldía o el admin certifican guías. El lado del guía (postularse, publicar horarios) queda fuera del portal, para una futura app de guías.
4. **Cupones de negocios y validación.** Por defecto: fase 2, con un código único por canje y una pantalla "Validar cupón".
5. **Horarios por día de la semana.** Por defecto: se mantiene el formato actual (un solo horario diario). Horarios por día requieren cambiar la app.
6. **Eventos de visita sin usuario ni reserva en el check-in.** Por defecto: la API agrega el usuario desde el token; proponer a la app que el check-in lleve `bookingId` y crear el evento "circuito completado".
7. **QR estático** (se puede fotografiar y escanear desde lejos). Por defecto: MVP con el formato actual `kplan:stop:<id>`; a futuro, un código rotativo o validar la ubicación.
8. **Backend.** Por defecto: esta tarea no lo construye; el portal queda con mocks y el contrato de [API](api.md).
9. **Ciudad y alcaldía.** `city` agrupa paradas (Ometepe figura como "Rivas"). Por defecto: una alcaldía corresponde a una `city`.
10. **Imágenes.** Por defecto: campo de URL con vista previa; la subida de archivos llega con el backend.
11. **Reseñas.** Por defecto: sólo lectura, sin moderación.

---
icon: lucide/flask-conical
---

# Datos mock y cuentas demo

Copiar los JSON de `mobile/assets/mock/` al portal. Las imágenes son de `picsum.photos` (placeholders).

| Archivo               | Contenido                                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stops.json`          | 34 paradas en 6 ciudades (Granada 6, Rivas/Ometepe 8, León 5, Matagalpa 7, Masaya 4, Estelí 4). 15 dan insignia y 12 no tienen horario                                                      |
| `circuits.json`       | 6 circuitos: 3 privados (`granada-historias-sabores`, `isla-de-ometepe`, `ruta-del-cafe`) y 3 creativos de alcaldías (`leon-colonial`, `masaya-artesanias-volcan`, `esteli-murales-tabaco`) |
| `circuit_groups.json` | 8 horarios de grupo de los circuitos creativos                                                                                                                                              |
| `guides.json`         | 8 personas: 5 guías, 1 que es guía y traductor, 2 traductores                                                                                                                               |
| `events.json`         | 4 eventos: La Gritería, Hípica de Granada, Festival de Poesía y El Torovenado                                                                                                               |
| `places.json`         | 5 lugares destacados                                                                                                                                                                          |
| `coupons.json`        | 5 cupones de K'Plan                                                                                                                                                                           |

(Propuesta) Archivos nuevos que el portal necesita:

```jsonc
// organizations.json: quién es dueño de qué
[
  { "id": "org-alcaldia-leon", "type": "alcaldia", "name": "Alcaldía de León", "city": "León",
    "stopIds": [], "circuitIds": ["leon-colonial"] },
  { "id": "org-alcaldia-masaya", "type": "alcaldia", "name": "Alcaldía de Masaya", "city": "Masaya",
    "stopIds": [], "circuitIds": ["masaya-artesanias-volcan"] },
  { "id": "org-tabacalera-esteli", "type": "negocio", "name": "Tabacalera artesanal", "city": "Estelí",
    "stopIds": ["esteli-tabacalera"], "circuitIds": [] },
  { "id": "org-finca-cafetalera", "type": "negocio", "name": "Finca cafetalera", "city": "Matagalpa",
    "stopIds": ["cafe-beneficio", "cafe-secado", "cafe-tueste", "cafe-cata"], "circuitIds": [] },
  { "id": "org-ruta-cafe", "type": "startup", "name": "Ruta del Café Tours", "city": "Matagalpa",
    "stopIds": [], "circuitIds": ["ruta-del-cafe"] }
]
```

Cuentas demo sugeridas (cualquier contraseña, igual que el login demo de la app; el correo decide el rol):

| Correo                  | Rol          | Organización                      |
| ----------------------- | ------------ | ------------------------------------ |
| `admin@kplan.demo`      | Admin K'Plan | —                                   |
| `leon@kplan.demo`       | Alcaldía     | Alcaldía de León                    |
| `masaya@kplan.demo`     | Alcaldía     | Alcaldía de Masaya                  |
| `tabacalera@kplan.demo` | Negocio      | Tabacalera artesanal (1 parada)     |
| `finca@kplan.demo`      | Negocio      | Finca cafetalera (varias paradas)   |
| `rutacafe@kplan.demo`   | Startup      | Ruta del Café Tours                 |

# Contexto del Proyecto - Centro Médico

## Descripción
Aplicación SAP CAP (Cloud Application Programming) con Node.js para un centro médico.

## Objetivo
Construir la app paso a paso para que el usuario vaya aprendiendo cada etapa.
Una vez terminada, el usuario va a customizar los botones y la UI.

## Paneles
- **Panel Pacientes**: vista y funciones para pacientes
- **Panel Administrativos**: vista y funciones para el personal administrativo

## Stack tecnológico
- **Backend**: SAP CAP + Node.js
- **Base de datos**: HANA (producción) / SQLite (desarrollo)
- **Frontend**: SAP Fiori Elements (generado con SAP Fiori Application Generator)
- **Autenticación**: XSUAA (producción)

## Usuario
- GitHub: Marcosfarhat
- Email: marcosfarhat@gmail.com

## Estado actual del proyecto
- [x] Proyecto inicializado con template SAP CAP bookshop
- [x] Git inicializado y repositorio en GitHub: https://github.com/Marcosfarhat/centro_medico_nodejs
- [x] Schema reemplazado con entidades del centro médico
- [x] Entidades creadas: Especialidades, Médicos, Pacientes, Turnos
- [x] Datos de prueba en CSV con UUIDs válidos
- [x] AdminService construido (CRUD completo para administrativos)
- [x] PacienteService construido (acceso restringido para pacientes)
- [x] Archivos del template bookshop eliminados de app/
- [x] Servidor cds watch accesible desde el navegador vía BAS (Ports: Get External URL)
- [x] Anotaciones UI Fiori para AdminService (app/admin/annotations.cds)
- [x] App admin-pacientes generada con SAP Fiori Application Generator
      → Lista, detalle y edición con Draft funcionando (Edit / Save / Cancel / Delete)
      → @odata.draft.enabled en AdminService.Pacientes
      → Generada con template "List Report Page" sobre AdminService/Pacientes
- [x] App admin-medicos generada con SAP Fiori Application Generator
      → Lista y detalle de Médicos funcionando
      → @odata.draft.enabled en AdminService.Medicos
      → Tabla read-only de Turnos del médico en el Object Page (via anotaciones)
- [x] App admin-especialidades generada con SAP Fiori Application Generator
      → Lista y detalle de Especialidades funcionando
      → Sin navigation entity (entidad simple)
- [x] App admin-turnos creada manualmente (List Report Page sobre AdminService/Turnos)
      → Lista y detalle de Turnos funcionando
- [x] App mis-turnos creada (portal del paciente - lista de turnos, solo lectura)
      → URL: /centro.medico.paciente.misturnos/index.html
- [x] App mi-perfil creada (portal del paciente - datos personales)
      → URL: /centro.medico.paciente.miperfil/index.html
- [x] Launchpad creado como archivo estático en app/launchpad.html
      → URL: /launchpad.html
      → Panel Administrativo: Pacientes, Médicos, Especialidades, Agenda
      → Portal del Paciente: Mis Turnos, Mi Perfil
- [x] Autenticación por roles configurada
      → @requires: 'admin' en AdminService
      → @requires: 'paciente' en PacienteService
      → xs-security.json con scopes y role-collections para XSUAA (producción)
      → En desarrollo: mocked auth con usuario 'dev' (admin + paciente)
      → server.js inyecta credenciales automáticamente → sin popup de login en BAS
      → Acceso: usar Ctrl+Click sobre localhost:4004 en el terminal de BAS (no copiar External URL)
- [x] Value Help para Paciente y Médico en formulario de Turnos
      → Dropdown con nombre/apellido en lugar de UUID
- [x] Colores por estado de turno (verde/naranja/rojo) y dropdown de EstadoTurno
- [x] Filtrado por usuario logueado en PacienteService
      → @restrict: cada paciente ve solo su propio perfil y sus propios turnos
      → $user en la condición where se reemplaza con el email del usuario logueado
      → En dev: server.js inyecta credenciales por ruta (admin → /odata/v4/admin, paciente test → /odata/v4/paciente)
- [ ] Customización de UI con componentes UI5 (ui5.sap.com)
      → Plan: usar extensiones de Fiori Elements para agregar controles UI5 custom
      → Primer objetivo: sap.m.Button + sap.m.MessageToast en admin-turnos
      → Otros controles identificados: SegmentedButton (filtro estado), ObjectStatus, Avatar, MessageBox

## Estructura de entidades
- **Especialidades**: nombre, descripcion → tiene muchos Médicos
- **Medicos**: nombre, apellido, matricula, especialidad → tiene muchos Turnos
- **Pacientes**: nombre, apellido, dni, fechaNacimiento, telefono, email, obraSocial, numeroAfiliado → tiene muchos Turnos
- **Turnos**: paciente, medico, fecha, hora, estado (pendiente/confirmado/cancelado), motivo, observaciones

## Servicios
- **AdminService** → `/odata/v4/admin` — CRUD completo de todas las entidades
- **PacienteService** → `/odata/v4/paciente` — Pacientes (editable), Turnos/Médicos/Especialidades (solo lectura)

## Apps Fiori Elements
- **app/admin-pacientes** → Lista + detalle de Pacientes para administrativos
  - Generada con SAP Fiori Application Generator (List Report Page)
  - URL: `/admin-pacientes/webapp/index.html`
  - Draft habilitado: Edit / Save / Cancel / Delete
- **app/admin-medicos** → Lista + detalle de Médicos para administrativos
  - Generada con SAP Fiori Application Generator (List Report Page)
  - URL: `/admin-medicos/webapp/index.html`
  - Draft habilitado: Edit / Save / Cancel / Delete
  - Sección read-only de Turnos del médico en el Object Page
- **app/admin-especialidades** → Lista + detalle de Especialidades para administrativos
  - Generada con SAP Fiori Application Generator (List Report Page)
  - URL: `/admin-especialidades/webapp/index.html`
- **app/admin-turnos** → Lista + detalle de Turnos para administrativos
  - Creada manualmente siguiendo el patrón del generator
  - URL: `/centro.medico.admin.adminturnos/index.html`
  - Draft habilitado: New / Edit / Save / Cancel / Delete
- **app/admin** → Anotaciones compartidas del AdminService

## Decisión de arquitectura: Turnos en Médicos
`Medicos.turnos` fue cambiado de `Composition` a `Association` para evitar conflicto de draft:
- CAP no permite que dos entidades con `@odata.draft.enabled` sean ambas dueñas de la misma entidad hija (`Turnos`)
- Con `Composition` en ambas (Pacientes y Medicos), CAP intentaba crear las tablas de draft de Turnos dos veces
- Solución: `Pacientes` es el dueño real de los turnos (Composition), `Medicos` solo los referencia (Association)
- Consecuencia: Turnos no aparece como sección navegable en el Object Page de Médicos
- Pendiente de decisión: mostrar turnos del médico como tabla read-only vía anotaciones (Opción B)

## Cómo levantar el servidor
```bash
cd /home/user/projects/centro_medico_node
cds watch
```
Luego exponer el puerto 4004 desde BAS: `Ctrl+Shift+P` → "Ports: Get External URL" → 4004

## Próximos pasos
1. Customización de UI y estética (colores, íconos, labels, layout)

## Historial de sesiones

### Sesión 1 - 05/06/2026
- Se creó el proyecto desde template SAP CAP

### Sesión 2 - 06/06/2026
- Se identificó proyecto en `/home/user/projects/centro_medico_node`
- Se inicializó git y configuró usuario (Marcosfarhat / marcosfarhat@gmail.com)
- Se hizo el primer commit con todos los archivos del template
- Se creó repo en GitHub: https://github.com/Marcosfarhat/centro_medico_nodejs
- Se reemplazó el schema de bookshop con entidades del centro médico
- Se crearon AdminService y PacienteService
- Se creó este archivo LEEME.md

### Sesión 3 - 06/06/2026
- Se hizo push exitoso a GitHub
- Se eliminaron archivos del template bookshop de app/
- El servidor cds watch corre sin errores (AdminService + PacienteService + 4 CSVs de datos)

### Sesión 4 - 06/06/2026 y 07/06/2026
- Se resolvió acceso al servidor desde el navegador en BAS (Ports: Get External URL → puerto 4004)
- Se crearon anotaciones Fiori manualmente (app/admin/annotations.cds) — labels, listas, formularios
- Se intentó crear app Fiori Elements manualmente → navegación fallaba por IDs no-UUID en CSVs
- Se corrigieron todos los CSVs con UUIDs válidos
- Se aprendió a usar el SAP Fiori Application Generator (Template Wizard en BAS)
- Se generó app admin-pacientes correctamente con el generator oficial
- Se habilitó @odata.draft.enabled en Pacientes → botones Edit, Delete, Share funcionando
- Lección aprendida: usar siempre el generator para apps Fiori Elements, no hacerlo a mano
- Próxima sesión: generar apps para Médicos, Turnos y Especialidades con el generator

### Sesión 5 - 11/06/2026
- Se generó app admin-medicos con SAP Fiori Application Generator (List Report + Object Page para Médicos)
- Se resolvió conflicto de draft: Medicos.turnos cambió de Composition a Association en db/schema.cds
- Ambas apps funcionando: admin-pacientes y admin-medicos
- Agregada tabla read-only de Turnos del médico vía anotación UI.ReferenceFacet → turnos/@UI.LineItem
- Generada app admin-especialidades (lista + detalle, sin navigation entity)
- Próxima sesión: generar admin-turnos y luego el panel de pacientes

### Sesión 6 - 12/06/2026
- Se creó app admin-turnos manualmente (sin wizard), aprendiendo cada archivo y su rol
- Se intentó @odata.draft.enabled en Turnos → conflicto con Pacientes (Composition owner)
- Solución: Turnos sin draft propio; se editan desde el Object Page de Pacientes
- Se agregó sección "Turnos" en el Object Page de Pacientes (Target: 'turnos/@UI.LineItem')
  → botones New/Edit/Delete funcionando gracias a la Composition + draft de Pacientes
- Próxima sesión: cambios de estética y UI (labels, colores, columnas, etc.)

### Sesión 10 - 15/06/2026
- Definido plan de customización UI usando ui5.sap.com
- Concepto clave: nuestras apps usan Fiori Elements → para agregar controles UI5 se usan EXTENSIONES
  (no se escribe XML/JS directamente, se extiende lo generado)
- Próxima sesión: implementar sap.m.Button + sap.m.MessageToast en admin-turnos como primer ejercicio
- Cómo usar ui5.sap.com: Controls → buscar control → pestaña Samples → botón "Try it" para editar en vivo

#### Controles UI5 planificados por orden de práctica
1. `sap.m.Button` + `sap.m.MessageToast` → botón "Confirmar Turno" con notificación (aprende: extensión de controlador)
2. `sap.m.SegmentedButton` → filtro rápido por estado en lista de turnos (aprende: filtros interactivos)
3. `sap.m.ObjectStatus` → estado del turno con color semántico (aprende: indicadores visuales)
4. `sap.m.Avatar` → ícono en header del paciente (aprende: personalización Object Page)
5. `sap.m.MessageBox` → confirmación antes de cancelar turno (aprende: diálogos modales)

### Sesión 8 + 9 - 14/06/2026

#### Problema que teníamos
- `@requires: 'admin'` y `@requires: 'paciente'` en los servicios + mocked auth sin usuarios → OData devolvía 401
- Fiori mostraba "Cannot login w/o session" → ese error era del PROXY DE BAS (sesión de BAS expirada), no de CAP
- En modo incógnito: el proxy de BAS también rechaza (no hay sesión BAS) → no sirve para testear

#### Cómo acceder correctamente en BAS
- En la terminal de BAS donde corre `cds watch`, hacer **Ctrl+Click** sobre `http://localhost:4004`
- BAS intercepta ese click y abre la app via su proxy con la sesión ya autenticada
- **NO** copiar y pegar el External URL en una ventana nueva/incógnita (pierde la sesión)

#### Fix de autenticación (server.js)
- `server.js` en la raíz es el entry point de CAP → se carga al arrancar
- Usa `cds.on('bootstrap', app => ...)` para agregar middleware de Express ANTES que el auth de CAP
- Inyecta automáticamente el usuario correcto según la ruta:
  - `/odata/v4/admin` → credenciales de `admin`
  - `/odata/v4/paciente` → credenciales del paciente de prueba actual
- **Sobreescribe siempre** el header Authorization (no condicional) para ignorar caché del browser
- En producción (`auth.kind = 'xsuaa'`): el bloque no se activa

#### Por qué Basic Auth tiene limitaciones en desarrollo
- Basic Auth guarda credenciales **por host** (no por ruta)
- Si te logueaste como `admin`, el browser manda esas credenciales para TODAS las rutas del mismo host
- El portal del paciente recibía credenciales de admin → 403 (rol incorrecto) → página en blanco
- Solución: el middleware sobreescribe el header según la ruta, ignorando el caché

#### Filtrado por usuario logueado (@restrict)
- `@restrict: [{ grant: '*', where: 'email = $user' }]` en `Pacientes`
  → cada paciente solo puede ver/editar su propio perfil
- `@restrict: [{ grant: 'READ', where: 'paciente.email = $user' }]` en `Turnos`
  → cada paciente solo ve sus propios turnos
- `$user` es la variable especial de CAP = el ID del usuario logueado (= nombre de usuario en mocked auth)
- En mocked auth: nombre de usuario = email del paciente → la comparación funciona perfectamente

#### Usuarios configurados (package.json)
- `admin` / `admin` → rol admin → ve todo en AdminService
- `juan.garcia@email.com` / `pass1` → rol paciente → ve solo sus datos
- `maria.martinez@email.com` / `pass2` → rol paciente
- `pedro.diaz@email.com` / `pass3` → rol paciente
- `sofia.torres@email.com` / `pass4` → rol paciente

#### Para cambiar el paciente de prueba en desarrollo
Modificar esta línea en `server.js`:
```javascript
const pacienteCreds = Buffer.from('juan.garcia@email.com:pass1').toString('base64')
```
Cambiar por el email y password del paciente que se quiere probar.

#### En producción
- XSUAA maneja el login real (OAuth2/SAML2)
- El token JWT de XSUAA contiene el email del usuario
- CAP usa ese email en `$user` → el @restrict filtra correctamente sin cambios en el código

### Sesión 7 - 13/06/2026
- Value Help para Paciente y Médico en formulario de Turnos (@Common.ValueList)
- Anotaciones PacienteService (app/paciente/annotations.cds)
- App mis-turnos: portal del paciente para ver sus turnos
- App mi-perfil: portal del paciente para ver sus datos personales
- Fiori Launchpad con tiles para todas las apps (HTML/CSS puro)
- Fix: manifest.json requerido por cds-plugin-ui5 en el launchpad
- Funcionalidad completa — próxima etapa: estética y customización

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
- [ ] Crear apps para Médicos, Turnos y Especialidades en AdminService
- [ ] Crear app para panel de Pacientes (PacienteService)
- [ ] Configurar SAP Fiori Launchpad para unificar todas las apps
- [ ] Customización de UI y botones

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
- **app/admin** → Anotaciones compartidas del AdminService

## Cómo levantar el servidor
```bash
cd /home/user/projects/centro_medico_node
cds watch
```
Luego exponer el puerto 4004 desde BAS: `Ctrl+Shift+P` → "Ports: Get External URL" → 4004

## Próximos pasos
1. Probar la app admin-pacientes generada (lista + detalle + edición)
2. Repetir el proceso con el generator para Médicos, Turnos y Especialidades
3. Crear app para el panel del paciente (PacienteService)
4. Configurar el Fiori Launchpad para unificar todo
5. Customización de UI y botones

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

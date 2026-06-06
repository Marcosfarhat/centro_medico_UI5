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
- **Frontend**: SAP Fiori Elements
- **Autenticación**: XSUAA (producción)

## Usuario
- GitHub: Marcosfarhat
- Email: marcosfarhat@gmail.com

## Estado actual del proyecto
- [x] Proyecto inicializado con template SAP CAP bookshop
- [x] Git inicializado y repositorio en GitHub: https://github.com/Marcosfarhat/centro_medico_nodejs
- [x] Schema reemplazado con entidades del centro médico
- [x] Entidades creadas: Especialidades, Médicos, Pacientes, Turnos
- [x] Datos de prueba en CSV para desarrollo local
- [x] AdminService construido (CRUD completo para administrativos)
- [x] PacienteService construido (acceso restringido para pacientes)
- [x] Archivos del template bookshop eliminados de app/ (admin-authors, admin-books, browse, genres)
- [x] app/services.cds y app/common.cds actualizados para el centro médico
- [x] Servidor cds watch corre sin errores en puerto 4004
- [ ] Resolver acceso al servidor desde el navegador en BAS (exposición de puertos pendiente)
- [ ] Anotaciones UI Fiori para los servicios (labels, listas, formularios)
- [ ] Customización de UI y botones

## Estructura de entidades
- **Especialidades**: nombre, descripcion → tiene muchos Médicos
- **Medicos**: nombre, apellido, matricula, especialidad → tiene muchos Turnos
- **Pacientes**: nombre, apellido, dni, fechaNacimiento, telefono, email, obraSocial, numeroAfiliado → tiene muchos Turnos
- **Turnos**: paciente, medico, fecha, hora, estado (pendiente/confirmado/cancelado), motivo, observaciones

## Servicios
- **AdminService** → `/odata/v4/admin` — CRUD completo de todas las entidades
- **PacienteService** → `/odata/v4/paciente` — Pacientes (editable), Turnos/Médicos/Especialidades (solo lectura)

## Próximos pasos
1. Resolver visualización en browser desde BAS (exposición de puertos)
2. Agregar anotaciones UI Fiori para mejorar las listas y formularios
3. Customización de UI y botones

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
- Se hizo push exitoso a GitHub (los 3 commits anteriores)
- Se eliminaron archivos del template bookshop de app/ (admin-authors, admin-books, browse, genres)
- Se actualizaron app/services.cds y app/common.cds
- El servidor cds watch corre sin errores (AdminService + PacienteService + 4 CSVs de datos)
- Pendiente: resolver exposición de puertos en BAS para ver la app en el navegador

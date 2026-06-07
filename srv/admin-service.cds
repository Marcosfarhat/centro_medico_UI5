using { centro.medico as cm } from '../db/schema';

// Servicio para el panel administrativo
// Los administrativos tienen acceso completo a todas las entidades
service AdminService {

  // CRUD completo de pacientes — draft habilitado para edición en Fiori Elements
  @odata.draft.enabled
  entity Pacientes      as projection on cm.Pacientes;

  // CRUD completo de médicos
  entity Medicos        as projection on cm.Medicos;

  // CRUD completo de especialidades
  entity Especialidades as projection on cm.Especialidades;

  // CRUD completo de turnos
  entity Turnos         as projection on cm.Turnos;
}

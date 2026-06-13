using { centro.medico as cm } from '../db/schema';

// Servicio para el panel de pacientes
// Solo accesible para usuarios con el rol 'paciente'
@requires: 'paciente'
service PacienteService {

  // Pacientes pueden ver y editar su propio perfil
  entity Pacientes      as projection on cm.Pacientes;

  // Pacientes pueden ver sus turnos
  @readonly
  entity Turnos         as projection on cm.Turnos;

  // Pacientes pueden ver los médicos disponibles (solo lectura)
  @readonly
  entity Medicos        as projection on cm.Medicos;

  // Pacientes pueden ver las especialidades (solo lectura)
  @readonly
  entity Especialidades as projection on cm.Especialidades;
}

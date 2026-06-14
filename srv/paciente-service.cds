using { centro.medico as cm } from '../db/schema';

@requires: 'paciente'
service PacienteService {

  // Solo el paciente cuyo email coincide con el usuario logueado puede ver/editar su perfil
  @restrict: [{ grant: '*', where: 'email = $user' }]
  entity Pacientes      as projection on cm.Pacientes;

  // Solo los turnos del paciente logueado (filtra por el email del paciente del turno)
  @restrict: [{ grant: 'READ', where: 'paciente.email = $user' }]
  entity Turnos         as projection on cm.Turnos;

  // Médicos y especialidades los pueden ver todos los pacientes
  @readonly entity Medicos        as projection on cm.Medicos;
  @readonly entity Especialidades as projection on cm.Especialidades;
}

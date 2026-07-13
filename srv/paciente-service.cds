using { centro.medico as cm } from '../db/schema';

// authenticated-user (en vez del rol 'paciente') porque en dev los pacientes se
// autentican por el comodin '*' de la auth mockeada, que da identidad pero no roles.
// La proteccion real de datos la hace el @restrict de abajo (email = $user): cada
// usuario ve SOLO las filas de su propio email. En prod, XSUAA igual asigna el rol.
@requires: 'authenticated-user'
service PacienteService {

  // Solo el paciente cuyo email coincide con el usuario logueado puede ver/editar su perfil
  @restrict: [{ grant: '*', where: 'email = $user' }]
  entity Pacientes      as projection on cm.Pacientes;

  // Solo los turnos del paciente logueado (filtra por el email del paciente del turno)
  @restrict: [{ grant: 'READ', where: 'paciente.email = $user' }]
  entity Turnos as projection on cm.Turnos {
    *,
    case estado
      when 'confirmado' then 3
      when 'cancelado'  then 1
      else                   2
    end as estadoCriticality : Integer
  };

  // Médicos y especialidades los pueden ver todos los pacientes
  @readonly entity Medicos        as projection on cm.Medicos;
  @readonly entity Especialidades as projection on cm.Especialidades;
}

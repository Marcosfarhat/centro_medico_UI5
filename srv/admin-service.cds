using { centro.medico as cm } from '../db/schema';

// Servicio para el panel administrativo
// Solo accesible para usuarios con el rol 'admin'
@requires: 'admin'
service AdminService {

  // CRUD completo de pacientes — draft habilitado para edición en Fiori Elements
  @odata.draft.enabled
  entity Pacientes      as projection on cm.Pacientes;

  // CRUD completo de médicos — draft habilitado para edición en Fiori Elements
  @odata.draft.enabled
  entity Medicos        as projection on cm.Medicos;

  // CRUD completo de especialidades
  entity Especialidades as projection on cm.Especialidades;

  // CRUD completo de turnos — sin draft propio (Turnos pertenece a la composition de Pacientes).
  // @UI.CreateHidden oculta el botón "Crear" estándar de Fiori Elements (no puede funcionar,
  // un turno no se inserta directo — ver botón custom "Crear Turno" en admin-turnos) sin tocar
  // la capacidad real de insertar: a diferencia de @Capabilities.InsertRestrictions.Insertable,
  // esto es solo de UI y no bloquea el deep-create vía la composition de Pacientes.
  @UI.CreateHidden: true
  entity Turnos as projection on cm.Turnos {
    *,
    case estado
      when 'confirmado' then 3
      when 'cancelado'  then 1
      else                   2
    end as estadoCriticality : Integer
  };
}

namespace centro.medico;

using { cuid, managed } from '@sap/cds/common';

entity Especialidades : cuid, managed {
  nombre       : String(100) @mandatory;
  descripcion  : String(255);
  medicos      : Composition of many Medicos on medicos.especialidad = $self;
}

entity Medicos : cuid, managed {
  nombre       : String(100) @mandatory;
  apellido     : String(100) @mandatory;
  matricula    : String(20)  @mandatory;
  especialidad : Association to Especialidades @mandatory;
  turnos       : Composition of many Turnos on turnos.medico = $self;
}

entity Pacientes : cuid, managed {
  nombre          : String(100) @mandatory;
  apellido        : String(100) @mandatory;
  dni             : String(20)  @mandatory;
  fechaNacimiento : Date;
  telefono        : String(20);
  email           : String(100);
  obraSocial      : String(100);
  numeroAfiliado  : String(50);
  turnos          : Composition of many Turnos on turnos.paciente = $self;
}

entity Turnos : cuid, managed {
  paciente      : Association to Pacientes    @mandatory;
  medico        : Association to Medicos      @mandatory;
  fecha         : Date                        @mandatory;
  hora          : Time                        @mandatory;
  estado        : String(20) default 'pendiente'; // pendiente | confirmado | cancelado
  motivo        : String(255);
  observaciones : String(500);
}

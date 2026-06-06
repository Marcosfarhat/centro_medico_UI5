using AdminService from '../../srv/admin-service';

// ─── PACIENTES ───────────────────────────────────────────────────────────────

// Labels de los campos (lo que aparece como título de columna o etiqueta)
annotate AdminService.Pacientes with {
  nombre          @title: 'Nombre';
  apellido        @title: 'Apellido';
  dni             @title: 'DNI';
  fechaNacimiento @title: 'Fecha de Nacimiento';
  telefono        @title: 'Teléfono';
  email           @title: 'Email';
  obraSocial      @title: 'Obra Social';
  numeroAfiliado  @title: 'Nro. Afiliado';
}

// Columnas que aparecen en la lista de pacientes
annotate AdminService.Pacientes with @(
  UI.LineItem: [
    { Value: apellido,   Label: 'Apellido'    },
    { Value: nombre,     Label: 'Nombre'      },
    { Value: dni,        Label: 'DNI'         },
    { Value: obraSocial, Label: 'Obra Social' },
    { Value: telefono,   Label: 'Teléfono'    },
  ],

  // Título que aparece en la pantalla de detalle de un paciente
  UI.HeaderInfo: {
    TypeName:       'Paciente',
    TypeNamePlural: 'Pacientes',
    Title:       { Value: apellido },
    Description: { Value: nombre   }
  },

  // Secciones del formulario de detalle
  UI.Facets: [
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Datos Personales',
      Target: '@UI.FieldGroup#DatosPersonales'
    },
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Obra Social',
      Target: '@UI.FieldGroup#ObraSocial'
    }
  ],

  // Campos de la sección "Datos Personales"
  UI.FieldGroup#DatosPersonales: {
    Label: 'Datos Personales',
    Data: [
      { Value: nombre          },
      { Value: apellido        },
      { Value: dni             },
      { Value: fechaNacimiento },
      { Value: telefono        },
      { Value: email           }
    ]
  },

  // Campos de la sección "Obra Social"
  UI.FieldGroup#ObraSocial: {
    Label: 'Obra Social',
    Data: [
      { Value: obraSocial     },
      { Value: numeroAfiliado }
    ]
  }
);

// ─── MÉDICOS ─────────────────────────────────────────────────────────────────

annotate AdminService.Medicos with {
  nombre       @title: 'Nombre';
  apellido     @title: 'Apellido';
  matricula    @title: 'Matrícula';
  especialidad @title: 'Especialidad';
}

annotate AdminService.Medicos with @(
  UI.LineItem: [
    { Value: apellido,            Label: 'Apellido'    },
    { Value: nombre,              Label: 'Nombre'      },
    { Value: matricula,           Label: 'Matrícula'   },
    { Value: especialidad.nombre, Label: 'Especialidad'}
  ],

  UI.HeaderInfo: {
    TypeName:       'Médico',
    TypeNamePlural: 'Médicos',
    Title:       { Value: apellido },
    Description: { Value: especialidad.nombre }
  },

  UI.Facets: [
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Datos del Médico',
      Target: '@UI.FieldGroup#DatosMedico'
    }
  ],

  UI.FieldGroup#DatosMedico: {
    Label: 'Datos del Médico',
    Data: [
      { Value: nombre       },
      { Value: apellido     },
      { Value: matricula    },
      { Value: especialidad_ID }
    ]
  }
);

// ─── ESPECIALIDADES ───────────────────────────────────────────────────────────

annotate AdminService.Especialidades with {
  nombre      @title: 'Especialidad';
  descripcion @title: 'Descripción';
}

annotate AdminService.Especialidades with @(
  UI.LineItem: [
    { Value: nombre,      Label: 'Especialidad' },
    { Value: descripcion, Label: 'Descripción'  }
  ],

  UI.HeaderInfo: {
    TypeName:       'Especialidad',
    TypeNamePlural: 'Especialidades',
    Title:       { Value: nombre      },
    Description: { Value: descripcion }
  },

  UI.Facets: [
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Datos',
      Target: '@UI.FieldGroup#Datos'
    }
  ],

  UI.FieldGroup#Datos: {
    Label: 'Datos',
    Data: [
      { Value: nombre      },
      { Value: descripcion }
    ]
  }
);

// ─── TURNOS ───────────────────────────────────────────────────────────────────

annotate AdminService.Turnos with {
  paciente      @title: 'Paciente';
  medico        @title: 'Médico';
  fecha         @title: 'Fecha';
  hora          @title: 'Hora';
  estado        @title: 'Estado';
  motivo        @title: 'Motivo';
  observaciones @title: 'Observaciones';
}

annotate AdminService.Turnos with @(
  UI.LineItem: [
    { Value: fecha,             Label: 'Fecha'    },
    { Value: hora,              Label: 'Hora'     },
    { Value: paciente.apellido, Label: 'Paciente' },
    { Value: medico.apellido,   Label: 'Médico'   },
    { Value: estado,            Label: 'Estado'   }
  ],

  UI.HeaderInfo: {
    TypeName:       'Turno',
    TypeNamePlural: 'Turnos',
    Title:       { Value: fecha   },
    Description: { Value: estado  }
  },

  UI.Facets: [
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Detalle del Turno',
      Target: '@UI.FieldGroup#DetalleTurno'
    }
  ],

  UI.FieldGroup#DetalleTurno: {
    Label: 'Detalle del Turno',
    Data: [
      { Value: paciente_ID  },
      { Value: medico_ID    },
      { Value: fecha        },
      { Value: hora         },
      { Value: estado       },
      { Value: motivo       },
      { Value: observaciones}
    ]
  }
);

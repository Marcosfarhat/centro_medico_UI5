const cds = require('@sap/cds');
const Anthropic = require('@anthropic-ai/sdk');
const { uuid } = cds.utils;

// ─── Asistente del PACIENTE (bookingChat) ────────────────────────────────────

const PROMPT_PACIENTE = `
Sos un asistente de reserva de turnos del Centro Médico. Ayudás al paciente a:
1. Elegir una especialidad
2. Elegir un médico de esa especialidad
3. Elegir fecha y horario disponible
4. Si el paciente no está registrado en el sistema, pedirle sus datos y registrarlo
5. Confirmar TODOS los datos con el paciente antes de reservar
6. Reservar el turno definitivo

Reglas:
- Nunca inventes médicos, especialidades ni horarios: siempre usá las herramientas para consultar datos reales, aunque te parezca que ya sabés la respuesta.
- Antes de llamar a crear_turno, repetile al paciente el resumen completo (médico, fecha, hora, motivo) en un mensaje de texto y esperá su confirmación explícita antes de reservar.
- Sé breve y conversacional, como una recepcionista real. Una pregunta genuina por vez, no le tires al paciente un formulario entero de una.
- El consultorio atiende de Lunes a Viernes de 9:00 a 17:00, en turnos de 30 minutos.
`.trim();

const TOOLS_PACIENTE = [
  {
    name: 'listar_especialidades',
    description: 'Lista todas las especialidades médicas disponibles en el centro, con su descripción.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'buscar_medicos_por_especialidad',
    description: 'Busca médicos que atienden una especialidad dada.',
    input_schema: {
      type: 'object',
      properties: { especialidad: { type: 'string', description: 'Nombre de la especialidad, ej. "Cardiología"' } },
      required: ['especialidad']
    }
  },
  {
    name: 'consultar_horarios_disponibles',
    description: 'Consulta los horarios libres de un médico en una fecha específica.',
    input_schema: {
      type: 'object',
      properties: {
        medico_id: { type: 'string', description: 'ID del médico' },
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' }
      },
      required: ['medico_id', 'fecha']
    }
  },
  {
    name: 'buscar_paciente_por_email',
    description: 'Busca si ya existe un paciente registrado con ese email.',
    input_schema: {
      type: 'object',
      properties: { email: { type: 'string' } },
      required: ['email']
    }
  },
  {
    name: 'crear_paciente',
    description: 'Registra un paciente nuevo que todavía no existe en el sistema. Pedirle todos los datos obligatorios antes de llamar.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        apellido: { type: 'string' },
        dni: { type: 'string' },
        fechaNacimiento: { type: 'string', description: 'YYYY-MM-DD' },
        telefono: { type: 'string' },
        email: { type: 'string' },
        obraSocial: { type: 'string' },
        numeroAfiliado: { type: 'string' }
      },
      required: ['nombre', 'apellido', 'dni', 'email']
    }
  },
  {
    name: 'crear_turno',
    description: 'Reserva el turno definitivo. Solo llamar después de que el paciente confirmó explícitamente médico, fecha, hora y motivo.',
    input_schema: {
      type: 'object',
      properties: {
        paciente_id: { type: 'string' },
        medico_id: { type: 'string' },
        fecha: { type: 'string', description: 'YYYY-MM-DD' },
        hora: { type: 'string', description: 'HH:MM' },
        motivo: { type: 'string' }
      },
      required: ['paciente_id', 'medico_id', 'fecha', 'hora', 'motivo']
    }
  }
];

// ─── Asistente de la AGENDA (agendaChat, solo admin) ─────────────────────────

const PROMPT_AGENDA = `
Sos el asistente interno de la agenda del Centro Médico, usado por el personal administrativo.
Podés buscar turnos (por fecha, estado, paciente o médico), confirmarlos, anularlos, buscar
pacientes y mostrar sus datos (por apellido, email o DNI, o todos), y también reservar turnos
nuevos o registrar pacientes si el administrativo lo pide.

Reglas:
- Nunca inventes datos: usá siempre las herramientas para consultar la agenda real.
- Antes de confirmar o anular un turno, mostrale al administrativo el detalle (paciente, médico, fecha y hora) y esperá su confirmación explícita.
- Al confirmar o anular un turno, el sistema genera una notificación por email al paciente (en este entorno es simulada, no se envía de verdad). Avisale al administrativo que la notificación se generó.
- Sé breve y profesional.
- El consultorio atiende de Lunes a Viernes de 9:00 a 17:00, en turnos de 30 minutos.
`.trim();

const TOOLS_AGENDA = TOOLS_PACIENTE.concat([
  {
    name: 'buscar_pacientes',
    description: 'Busca pacientes y devuelve su ficha completa (nombre, apellido, dni, fechaNacimiento, telefono, email, obraSocial, numeroAfiliado). Todos los filtros son opcionales y se combinan; SIN ningún filtro devuelve TODOS los pacientes (por ej. para "dame los mails de todos los pacientes" llamá esta herramienta sin parámetros).',
    input_schema: {
      type: 'object',
      properties: {
        apellido: { type: 'string', description: 'Apellido o parte del apellido' },
        email: { type: 'string', description: 'Email o parte del email' },
        dni: { type: 'string', description: 'DNI o parte del documento' }
      },
      required: []
    }
  },
  {
    name: 'buscar_turnos',
    description: 'Busca turnos en la agenda. Todos los filtros son opcionales y se pueden combinar. Usar antes de confirmar o anular, para identificar el turno exacto.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'YYYY-MM-DD' },
        estado: { type: 'string', enum: ['pendiente', 'confirmado', 'cancelado'] },
        apellido_paciente: { type: 'string', description: 'Apellido (o parte) del paciente' },
        apellido_medico: { type: 'string', description: 'Apellido (o parte) del médico' }
      },
      required: []
    }
  },
  {
    name: 'confirmar_turno',
    description: 'Confirma un turno pendiente (estado pasa a "confirmado") y genera la notificación por email al paciente. Solo llamar con el ID exacto obtenido de buscar_turnos y después de que el administrativo confirmó.',
    input_schema: {
      type: 'object',
      properties: { turno_id: { type: 'string' } },
      required: ['turno_id']
    }
  },
  {
    name: 'anular_turno',
    description: 'Anula un turno (estado pasa a "cancelado") y genera la notificación por email al paciente. Solo llamar con el ID exacto obtenido de buscar_turnos y después de que el administrativo confirmó.',
    input_schema: {
      type: 'object',
      properties: {
        turno_id: { type: 'string' },
        motivo_anulacion: { type: 'string', description: 'Opcional: razón que se incluye en el mail al paciente' }
      },
      required: ['turno_id']
    }
  }
]);

module.exports = cds.service.impl(async function () {
  const anthropic = new Anthropic();
  const { Especialidades, Medicos, Pacientes, Turnos } = cds.entities('centro.medico');

  // Trae un turno con los datos del paciente y del médico (para mostrar
  // detalle y armar el mail). Devuelve null si no existe.
  async function cargarTurnoCompleto(turno_id) {
    const turno = await SELECT.one.from(Turnos).where({ ID: turno_id });
    if (!turno) return null;
    const paciente = await SELECT.one.from(Pacientes).where({ ID: turno.paciente_ID });
    const medico = await SELECT.one.from(Medicos).where({ ID: turno.medico_ID });
    return { turno, paciente, medico };
  }

  // SIMULACION de envio de email: arma el mail completo y lo loguea en la
  // consola del servidor en vez de enviarlo. El dia que haya mails reales,
  // esta funcion se reemplaza por el envio de verdad y nada mas cambia.
  function enviarEmailSimulado(para, asunto, cuerpo) {
    const email = { para, asunto, cuerpo };
    console.log('\n═══ EMAIL SIMULADO (no enviado) ═══');
    console.log(`Para:    ${para}`);
    console.log(`Asunto:  ${asunto}`);
    console.log(`Cuerpo:  ${cuerpo}`);
    console.log('═══════════════════════════════════\n');
    return email;
  }

  // --- implementacion real de cada herramienta, contra la base de datos ---

  const TOOL_IMPLS = {

    async listar_especialidades() {
      return await SELECT.from(Especialidades).columns('ID', 'nombre', 'descripcion');
    },

    async buscar_medicos_por_especialidad({ especialidad }) {
      return await SELECT.from(Medicos)
        .columns('ID', 'nombre', 'apellido', 'matricula')
        .where({ 'especialidad.nombre': { like: `%${especialidad}%` } });
    },

    async consultar_horarios_disponibles({ medico_id, fecha }) {
      const dia = new Date(`${fecha}T00:00:00`).getDay(); // 0 = domingo, 6 = sabado
      if (dia === 0 || dia === 6) {
        return { disponibles: [], nota: 'El consultorio no atiende fines de semana' };
      }

      const ocupados = await SELECT.from(Turnos)
        .columns('hora')
        .where({ medico_ID: medico_id, fecha, estado: { '!=': 'cancelado' } });
      const horasOcupadas = new Set(ocupados.map((t) => t.hora.slice(0, 5)));

      const disponibles = [];
      for (let h = 9; h < 17; h++) {
        for (const m of [0, 30]) {
          const slot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          if (!horasOcupadas.has(slot)) disponibles.push(slot);
        }
      }
      return { disponibles };
    },

    async buscar_paciente_por_email({ email }) {
      const paciente = await SELECT.one.from(Pacientes).where({ email });
      return paciente ? { existe: true, paciente_id: paciente.ID, nombre: paciente.nombre } : { existe: false };
    },

    async crear_paciente(datos) {
      const existente = await SELECT.one.from(Pacientes)
        .where({ dni: datos.dni })
        .or({ email: datos.email });
      if (existente) return { yaExistia: true, paciente_id: existente.ID };

      const ID = uuid();
      await INSERT.into(Pacientes).entries({ ID, ...datos });
      return { paciente_id: ID };
    },

    async crear_turno({ paciente_id, medico_id, fecha, hora, motivo }) {
      // Validacion del lado del servidor: no confiamos en que el modelo
      // solo proponga horarios validos -- lo verificamos siempre acá,
      // sea cual sea el motivo por el que llegó un valor fuera de rango.
      const dia = new Date(`${fecha}T00:00:00`).getDay();
      if (dia === 0 || dia === 6) {
        return { error: 'El consultorio no atiende fines de semana. Elegí otra fecha.' };
      }
      if (new Date(`${fecha}T${hora}`) < new Date()) {
        return { error: 'Esa fecha/hora ya pasó. Elegí un horario futuro.' };
      }
      const [hh, mm] = hora.split(':').map(Number);
      const esHorarioValido = hh >= 9 && hh < 17 && (mm === 0 || mm === 30);
      if (!esHorarioValido) {
        return { error: 'Ese horario no está dentro de la atención (Lunes a Viernes, 9:00 a 17:00, cada 30 minutos).' };
      }

      // Re-chequeo de disponibilidad justo antes de guardar: cierra la
      // ventana entre "consultar horarios" y "confirmar" donde otra
      // persona pudo haberse quedado con el mismo turno.
      const ocupado = await SELECT.one.from(Turnos)
        .where({ medico_ID: medico_id, fecha, hora: `${hora}:00`, estado: { '!=': 'cancelado' } });
      if (ocupado) {
        return { error: 'Justo se ocupó ese horario. Elegí otro y volvé a intentar.' };
      }

      const ID = uuid();
      await INSERT.into(Turnos).entries({
        ID,
        paciente_ID: paciente_id,
        medico_ID: medico_id,
        fecha,
        hora,
        motivo,
        estado: 'pendiente'
      });
      return { turno_id: ID, estado: 'pendiente' };
    },

    // --- herramientas exclusivas de la agenda (admin) ---

    async buscar_pacientes({ apellido, email, dni } = {}) {
      // Traemos todos y filtramos en JS: el LIKE de SQLite distingue acentos
      // (no matchea "Diaz" con "Díaz"). Normalizando (sin tildes, en minusculas)
      // la busqueda es insensible a acentos y mayusculas, como espera una recepcion.
      // A la escala de una clinica (cientos de pacientes) traer todos es trivial.
      const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

      const todos = await SELECT.from(Pacientes)
        .columns('ID', 'nombre', 'apellido', 'dni', 'fechaNacimiento', 'telefono', 'email', 'obraSocial', 'numeroAfiliado')
        .orderBy('apellido', 'nombre');

      const pacientes = todos.filter((p) =>
        (!apellido || norm(p.apellido).includes(norm(apellido))) &&
        (!email || norm(p.email).includes(norm(email))) &&
        (!dni || norm(p.dni).includes(norm(dni)))
      );

      return { cantidad: pacientes.length, pacientes };
    },

    async buscar_turnos({ fecha, estado, apellido_paciente, apellido_medico }) {
      const where = {};
      if (fecha) where.fecha = fecha;
      if (estado) where.estado = estado;
      if (apellido_paciente) where['paciente.apellido'] = { like: `%${apellido_paciente}%` };
      if (apellido_medico) where['medico.apellido'] = { like: `%${apellido_medico}%` };

      const turnos = await SELECT.from(Turnos, (t) => {
        t.ID, t.fecha, t.hora, t.estado, t.motivo,
        t.paciente((p) => { p.nombre, p.apellido, p.email }),
        t.medico((m) => { m.nombre, m.apellido });
      }).where(where).orderBy('fecha', 'hora');

      return { cantidad: turnos.length, turnos };
    },

    async confirmar_turno({ turno_id }) {
      const datos = await cargarTurnoCompleto(turno_id);
      if (!datos) return { error: 'No existe un turno con ese ID.' };
      const { turno, paciente, medico } = datos;

      if (turno.estado === 'confirmado') return { nota: 'El turno ya estaba confirmado.' };
      if (turno.estado === 'cancelado') return { error: 'El turno está cancelado; no se puede confirmar. Habría que crear uno nuevo.' };

      await UPDATE(Turnos).set({ estado: 'confirmado' }).where({ ID: turno_id });

      const email = enviarEmailSimulado(
        paciente.email,
        'Tu turno fue confirmado - Centro Médico',
        `Hola ${paciente.nombre}: te confirmamos tu turno con ${medico.apellido}, ${medico.nombre} ` +
        `el ${turno.fecha} a las ${turno.hora.slice(0, 5)}. Te esperamos 10 minutos antes.`
      );

      return { ok: true, estado: 'confirmado', notificacion_email: email };
    },

    async anular_turno({ turno_id, motivo_anulacion }) {
      const datos = await cargarTurnoCompleto(turno_id);
      if (!datos) return { error: 'No existe un turno con ese ID.' };
      const { turno, paciente, medico } = datos;

      if (turno.estado === 'cancelado') return { nota: 'El turno ya estaba cancelado.' };

      await UPDATE(Turnos).set({ estado: 'cancelado' }).where({ ID: turno_id });

      const email = enviarEmailSimulado(
        paciente.email,
        'Tu turno fue anulado - Centro Médico',
        `Hola ${paciente.nombre}: lamentamos informarte que tu turno con ${medico.apellido}, ${medico.nombre} ` +
        `del ${turno.fecha} a las ${turno.hora.slice(0, 5)} fue anulado.` +
        (motivo_anulacion ? ` Motivo: ${motivo_anulacion}.` : '') +
        ` Podés reservar uno nuevo cuando quieras.`
      );

      return { ok: true, estado: 'cancelado', notificacion_email: email };
    }
  };

  // Loop de tool use compartido por los dos asistentes: llama a Claude, ejecuta
  // las herramientas que pida contra la base real, le devuelve los resultados,
  // y repite hasta que responda con texto para el usuario.
  async function conversar(messages, system, tools) {
    let response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system,
      tools,
      messages
    });

    while (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const fn = TOOL_IMPLS[block.name];
        let result;
        try {
          result = fn ? await fn(block.input) : { error: `Herramienta desconocida: ${block.name}` };
        } catch (toolErr) {
          result = { error: toolErr.message };
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result)
        });
      }
      messages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        system,
        tools,
        messages
      });
    }

    messages.push({ role: 'assistant', content: response.content });
    return messages;
  }

  // --- endpoint simple, de un solo turno (el primero que hicimos) ---

  this.on('chat', async (req) => {
    const { message } = req.data;
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }]
      });
      const textBlock = response.content.find((block) => block.type === 'text');
      return textBlock ? textBlock.text : '';
    } catch (err) {
      req.error(502, `Error llamando a Claude: ${err.message}`);
    }
  });

  // --- asistente del paciente: reservar turnos ---

  this.on('bookingChat', async (req) => {
    try {
      const messages = await conversar(JSON.parse(req.data.historyJson), PROMPT_PACIENTE, TOOLS_PACIENTE);
      return JSON.stringify(messages);
    } catch (err) {
      req.error(502, `Error en el asistente: ${err.message}`);
    }
  });

  // --- asistente de la agenda (admin): ademas busca, confirma y anula ---

  this.on('agendaChat', async (req) => {
    try {
      const messages = await conversar(JSON.parse(req.data.historyJson), PROMPT_AGENDA, TOOLS_AGENDA);
      return JSON.stringify(messages);
    } catch (err) {
      req.error(502, `Error en el asistente: ${err.message}`);
    }
  });
});

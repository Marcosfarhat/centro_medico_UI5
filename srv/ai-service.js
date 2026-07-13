const cds = require('@sap/cds');
const Anthropic = require('@anthropic-ai/sdk');
const { uuid } = cds.utils;

const SYSTEM_PROMPT = `
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

const TOOLS = [
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

module.exports = cds.service.impl(async function () {
  const anthropic = new Anthropic();
  const { Especialidades, Medicos, Pacientes, Turnos } = cds.entities('centro.medico');

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
    }
  };

  // --- endpoint simple, de un solo turno (ya lo teniamos) ---

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

  // --- asistente conversacional con tool use ---

  this.on('bookingChat', async (req) => {
    const { historyJson } = req.data;
    let messages = JSON.parse(historyJson);

    try {
      let response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages
      });

      // Mientras Claude pida ejecutar herramientas, las corremos de verdad
      // contra la base y le devolvemos el resultado, hasta que decida
      // que ya tiene lo necesario para responderle en texto al paciente.
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
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages
        });
      }

      messages.push({ role: 'assistant', content: response.content });
      return JSON.stringify(messages);
    } catch (err) {
      req.error(502, `Error en el asistente: ${err.message}`);
    }
  });
});

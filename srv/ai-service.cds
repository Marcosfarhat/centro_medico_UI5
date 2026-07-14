@requires: 'authenticated-user'
service AiService {
  action chat(message: String) returns String;

  // historyJson: el historial completo de la conversacion (array de mensajes), como JSON.
  // Se manda el historial entero en cada llamada porque la API de Claude no guarda estado
  // entre pedidos -- el cliente es responsable de acumularlo y reenviarlo.
  action bookingChat(historyJson: LargeString) returns LargeString;

  // Asistente de la agenda: ademas de reservar, busca/confirma/anula turnos y
  // genera la notificacion por mail al paciente (simulada en este entorno).
  // Solo admin: un paciente NO debe poder confirmar/anular turnos via chat.
  @requires: 'admin'
  action agendaChat(historyJson: LargeString) returns LargeString;
}

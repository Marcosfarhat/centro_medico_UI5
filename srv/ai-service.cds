@requires: 'authenticated-user'
service AiService {
  action chat(message: String) returns String;

  // historyJson: el historial completo de la conversacion (array de mensajes), como JSON.
  // Se manda el historial entero en cada llamada porque la API de Claude no guarda estado
  // entre pedidos -- el cliente es responsable de acumularlo y reenviarlo.
  action bookingChat(historyJson: LargeString) returns LargeString;
}

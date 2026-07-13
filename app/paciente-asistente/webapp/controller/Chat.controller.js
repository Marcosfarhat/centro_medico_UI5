sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  var SALUDO = { autor: "Asistente", texto: "¡Hola! Soy el asistente del Centro Médico. Contame qué turno querés sacar y te ayudo a reservarlo." };

  // Convierte el historial crudo (formato API de Claude, con tool_use/tool_result)
  // en la lista simple para mostrar: solo los turnos con texto real.
  function extraerMensajesParaMostrar(aHistorial) {
    var aMostrar = [];
    aHistorial.forEach(function (oMsg) {
      if (oMsg.role === "user" && typeof oMsg.content === "string") {
        aMostrar.push({ autor: "Vos", texto: oMsg.content });
      } else if (oMsg.role === "assistant" && Array.isArray(oMsg.content)) {
        var sTexto = oMsg.content
          .filter(function (oBlock) { return oBlock.type === "text"; })
          .map(function (oBlock) { return oBlock.text; })
          .join("\n");
        if (sTexto) {
          aMostrar.push({ autor: "Asistente", texto: sTexto });
        }
      }
    });
    return aMostrar;
  }

  return Controller.extend("centro.medico.paciente.asistente.controller.Chat", {

    onInit: function () {
      this._email = null;                                  // mail del paciente logueado
      this._aChatHistory = [];                             // historial crudo que se reenvia a Claude
      this._oChatModel = new JSONModel({ messages: [SALUDO] });
      this.getView().setModel(this._oChatModel, "chat");
      this.getView().setModel(new JSONModel({ value: [] }), "turnos");
    },

    // --- navegacion entre paginas del App ---
    _navA: function (sPageId) {
      this.byId("portalApp").to(this.byId(sPageId).getId());
    },

    // --- login ---
    onIngresar: function () {
      var sEmail = this.byId("loginEmail").getValue().trim();
      if (!sEmail || sEmail.indexOf("@") === -1) {
        MessageToast.show("Ingresá un email válido");
        return;
      }
      this._email = sEmail;
      this._navA("pageChat");
    },

    onSalir: function () {
      // Vuelve al login y limpia el estado de la sesion.
      this._email = null;
      this._aChatHistory = [];
      this._oChatModel.setProperty("/messages", [SALUDO]);
      this.byId("loginEmail").setValue("");
      this._navA("pageLogin");
    },

    // --- chat ---
    _refrescarMensajes: function () {
      this._oChatModel.setProperty("/messages", [SALUDO].concat(extraerMensajesParaMostrar(this._aChatHistory)));
      this._scrollAlFinal();
    },

    onEnviar: function () {
      var oInput = this.byId("chatInput");
      var sTexto = oInput.getValue().trim();
      if (!sTexto) return;

      oInput.setValue("");
      this._aChatHistory.push({ role: "user", content: sTexto });
      this._refrescarMensajes();

      var that = this;
      fetch("/odata/v4/ai/bookingChat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyJson: JSON.stringify(this._aChatHistory) })
      })
        .then(function (oResponse) {
          if (!oResponse.ok) { throw new Error("HTTP " + oResponse.status); }
          return oResponse.json();
        })
        .then(function (oData) {
          that._aChatHistory = JSON.parse(oData.value);
          that._refrescarMensajes();
        })
        .catch(function (oError) {
          MessageBox.error("No se pudo hablar con el asistente: " + oError.message);
        });
    },

    _scrollAlFinal: function () {
      var that = this;
      setTimeout(function () {
        var oList = that.byId("chatList");
        var aItems = oList.getItems();
        var oUltimo = aItems[aItems.length - 1];
        var oDomRef = oUltimo && oUltimo.getDomRef();
        if (oDomRef) { oDomRef.scrollIntoView({ block: "end" }); }
      }, 0);
    },

    // --- mis turnos ---
    onVerTurnos: function () {
      this._navA("pageTurnos");

      var that = this;
      // El header x-paciente-email le dice a server.js quien es el paciente
      // logueado; ese mail se vuelve $user y el @restrict del PacienteService
      // devuelve SOLO los turnos de este paciente.
      fetch("/odata/v4/paciente/Turnos?$select=fecha,hora,estado,motivo&$expand=medico($select=nombre,apellido)&$orderby=fecha", {
        headers: { "x-paciente-email": this._email }
      })
        .then(function (oResponse) {
          if (!oResponse.ok) { throw new Error("HTTP " + oResponse.status); }
          return oResponse.json();
        })
        .then(function (oData) {
          that.getView().getModel("turnos").setData(oData);
        })
        .catch(function (oError) {
          MessageBox.error("No se pudieron cargar tus turnos: " + oError.message);
        });
    },

    onVolverChat: function () {
      this._navA("pageChat");
    }

  });
});

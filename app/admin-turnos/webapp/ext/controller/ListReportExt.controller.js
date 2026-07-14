sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/ui/core/Fragment",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (ControllerExtension, Fragment, JSONModel, MessageToast, MessageBox) {
  "use strict";

  // Convierte el historial "crudo" (el que entiende la API de Claude, con
  // bloques de tool_use/tool_result) en la lista simple que se muestra en el
  // chat: solo los turnos con texto real, sin los pasos internos de las tools.
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

  return ControllerExtension.extend("centro.medico.admin.adminturnos.ext.controller.ListReportExt", {

    metadata: {
      methods: {
        onCrearTurno: { public: true, final: true },
        onConfirmarCrearTurno: { public: true, final: true },
        onCancelarCrearTurno: { public: true, final: true },
        onAbrirChat: { public: true, final: true },
        onEnviarMensajeChat: { public: true, final: true },
        onCerrarChat: { public: true, final: true }
      }
    },

    // Abre el dialogo de chat. this._aChatHistory guarda el historial "crudo"
    // (el que se manda tal cual a la API de Claude en cada mensaje); el
    // JSONModel "chat" guarda solo la version simplificada para mostrar.
    onAbrirChat: function () {
      var oView = this.base.getView();
      var that = this;

      if (!this._oChatDialogPromise) {
        this._aChatHistory = [];
        this._oChatModel = new JSONModel({ messages: [] });

        this._oChatDialogPromise = Fragment.load({
          id: oView.getId(),
          name: "centro.medico.admin.adminturnos.ext.fragment.ChatDialog",
          controller: this
        }).then(function (oDialog) {
          oDialog.setModel(that._oChatModel, "chat");
          oView.addDependent(oDialog);
          return oDialog;
        });
      }

      this._oChatDialogPromise.then(function (oDialog) {
        oDialog.open();
      });
    },

    onCerrarChat: function () {
      this._oChatDialogPromise.then(function (oDialog) {
        oDialog.close();
      });
    },

    onEnviarMensajeChat: function () {
      var oView = this.base.getView();
      var oInput = Fragment.byId(oView.getId(), "chatInput");
      var sTexto = oInput.getValue().trim();
      if (!sTexto) return;

      oInput.setValue("");
      this._aChatHistory.push({ role: "user", content: sTexto });
      this._oChatModel.setProperty("/messages", extraerMensajesParaMostrar(this._aChatHistory));
      this._scrollChatAlFinal();

      var that = this;
      // agendaChat (no bookingChat): la version admin del asistente, que ademas
      // de reservar puede buscar, confirmar y anular turnos de la agenda.
      fetch("/odata/v4/ai/agendaChat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyJson: JSON.stringify(this._aChatHistory) })
      })
        .then(function (oResponse) {
          if (!oResponse.ok) {
            throw new Error("HTTP " + oResponse.status);
          }
          return oResponse.json();
        })
        .then(function (oData) {
          that._aChatHistory = JSON.parse(oData.value);
          that._oChatModel.setProperty("/messages", extraerMensajesParaMostrar(that._aChatHistory));
          that._scrollChatAlFinal();
        })
        .catch(function (oError) {
          MessageBox.error("No se pudo hablar con el asistente: " + oError.message);
        });
    },

    // El modelo se actualiza en forma asincronica (setProperty dispara el
    // re-render, pero no es instantaneo). El setTimeout(...,0) espera a que
    // UI5 termine de pintar el item nuevo antes de scrollear hacia el.
    _scrollChatAlFinal: function () {
      var oView = this.base.getView();
      setTimeout(function () {
        var oList = Fragment.byId(oView.getId(), "chatList");
        var aItems = oList.getItems();
        var oUltimoItem = aItems[aItems.length - 1];
        var oDomRef = oUltimoItem && oUltimoItem.getDomRef();
        if (oDomRef) {
          oDomRef.scrollIntoView({ block: "end" });
        }
      }, 0);
    },

    // Abre el dialogo. Lo carga una sola vez y lo reutiliza en los siguientes clicks.
    onCrearTurno: function () {
      var oView = this.base.getView();

      if (!this._oDialogPromise) {
        this._oDialogPromise = Fragment.load({
          id: oView.getId(),
          name: "centro.medico.admin.adminturnos.ext.fragment.CrearTurnoDialog",
          controller: this
        }).then(function (oDialog) {
          oView.addDependent(oDialog);
          return oDialog;
        });
      }

      this._oDialogPromise.then(function (oDialog) {
        oDialog.open();
      });
    },

    onCancelarCrearTurno: function () {
      this._oDialogPromise.then(function (oDialog) {
        oDialog.close();
      });
    },

    // Lee el formulario, valida lo obligatorio y dispara el mismo tipo de flujo de
    // draft que el boton "Confirmar Turno": draftEdit sobre el Paciente elegido,
    // crear el turno hijo dentro del draft (composition), draftActivate para guardar.
    onConfirmarCrearTurno: function () {
      var oView = this.base.getView();
      var oModel = oView.getModel();
      var sViewId = oView.getId();

      var oSelectPaciente = Fragment.byId(sViewId, "selectPaciente");
      var oSelectMedico = Fragment.byId(sViewId, "selectMedico");
      var oDpFecha = Fragment.byId(sViewId, "dpFecha");
      var oTpHora = Fragment.byId(sViewId, "tpHora");
      var oInputMotivo = Fragment.byId(sViewId, "inputMotivo");

      var sPacienteId = oSelectPaciente.getSelectedKey();
      var sMedicoId = oSelectMedico.getSelectedKey();
      var sFecha = oDpFecha.getValue();
      var sHora = oTpHora.getValue();
      var sMotivo = oInputMotivo.getValue();

      if (!sPacienteId || !sMedicoId || !sFecha || !sHora) {
        MessageToast.show("Completá Paciente, Médico, Fecha y Hora");
        return;
      }

      var oDraftEdit = oModel.bindContext(
        "AdminService.draftEdit(...)",
        oModel.bindContext("/Pacientes(ID='" + sPacienteId + "',IsActiveEntity=true)").getBoundContext()
      );
      oDraftEdit.setParameter("PreserveChanges", true);

      var that = this;

      oDraftEdit.execute().then(function () {
        // Deep create: la lista "turnos" del Paciente en draft, igual que cuando
        // probamos a mano "POST /Pacientes(...)/turnos" con curl.
        var oNewTurnoContext = oModel.bindList(
          "/Pacientes(ID='" + sPacienteId + "',IsActiveEntity=false)/turnos"
        ).create({
          medico_ID: sMedicoId,
          fecha: sFecha,
          hora: sHora,
          motivo: sMotivo
        });

        // Contexto nuevo y limpio para draftActivate (ver comentario en
        // ObjectPageExt.controller.js sobre nested deferred operation bindings).
        var oPacienteDraftContext = oModel.bindContext(
          "/Pacientes(ID='" + sPacienteId + "',IsActiveEntity=false)"
        ).getBoundContext();

        return oNewTurnoContext.created().then(function () {
          var oDraftActivate = oModel.bindContext("AdminService.draftActivate(...)", oPacienteDraftContext);
          return oDraftActivate.execute();
        }).catch(function (oStepError) {
          // Si algo falló DESPUÉS de abrir el draft, el Paciente queda trabado en
          // edición hasta que alguien lo descarte a mano. Lo descartamos solos
          // (igual al botón "Cancel" de la UI) y recién ahí mostramos el error.
          return oPacienteDraftContext.delete().catch(function () {
            // si ni el descarte funciona, no hay nada más que hacer acá
          }).then(function () {
            throw oStepError;
          });
        });
      }).then(function () {
        MessageToast.show("Turno creado");
        return that._oDialogPromise.then(function (oDialog) {
          oDialog.close();
          return oModel.refresh();
        });
      }).catch(function (oError) {
        MessageBox.error("No se pudo crear el turno: " + oError.message);
      });
    }

  });
});

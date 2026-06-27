sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (ControllerExtension, Fragment, MessageToast, MessageBox) {
  "use strict";

  return ControllerExtension.extend("centro.medico.admin.adminturnos.ext.controller.ListReportExt", {

    metadata: {
      methods: {
        onCrearTurno: { public: true, final: true },
        onConfirmarCrearTurno: { public: true, final: true },
        onCancelarCrearTurno: { public: true, final: true }
      }
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

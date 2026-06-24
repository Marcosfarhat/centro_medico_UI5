sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (ControllerExtension, MessageToast, MessageBox) {
  "use strict";

  return ControllerExtension.extend("centro.medico.admin.adminturnos.ext.controller.ObjectPageExt", {

    metadata: {
      methods: {
        onConfirmarTurno: { public: true, final: true }
      }
    },

    onConfirmarTurno: function () {
      var oTurnoContext = this.base.getView().getBindingContext();
      var oModel = oTurnoContext.getModel();
      var sTurnoId = oTurnoContext.getObject().ID;

      // Turnos es composition child de Pacientes (que tiene draft). CAP no deja
      // modificar un turno activo directo: hay que pasar por el draft del Paciente
      // dueño (draftEdit -> editar el turno hijo -> draftActivate), igual que probamos
      // a mano con curl.

      // 1. Leemos paciente_ID y estado directo del back end (no confiamos en que ya
      //    estén cargados en el binding de la página).
      var oReadTurno = oModel.bindContext(
        "/Turnos(ID='" + sTurnoId + "',IsActiveEntity=true)",
        null,
        { $select: "paciente_ID,estado" }
      );

      oReadTurno.requestObject().then(function (oTurno) {
        if (oTurno.estado === "confirmado") {
          MessageToast.show("El turno ya estaba confirmado");
          return Promise.resolve();
        }

        // 2. draftEdit sobre el Paciente dueño del turno: crea el draft.
        var oPacienteContext = oModel.bindContext(
          "/Pacientes(ID='" + oTurno.paciente_ID + "',IsActiveEntity=true)"
        ).getBoundContext();

        var oDraftEdit = oModel.bindContext("AdminService.draftEdit(...)", oPacienteContext);
        oDraftEdit.setParameter("PreserveChanges", true);

        return oDraftEdit.execute().then(function () {
          var oPacienteDraftContext = oDraftEdit.getBoundContext();

          // 3. Dentro del draft, el turno ya existe en su propio entity set,
          //    direccionable con IsActiveEntity=false.
          var oTurnoDraftContext = oModel.bindContext(
            "/Turnos(ID='" + sTurnoId + "',IsActiveEntity=false)"
          ).getBoundContext();

          return oTurnoDraftContext.requestObject().then(function () {
            return oTurnoDraftContext.setProperty("estado", "confirmado");
          }).then(function () {
            // 4. draftActivate sobre el Paciente: guarda todo (root + turno hijo).
            var oDraftActivate = oModel.bindContext("AdminService.draftActivate(...)", oPacienteDraftContext);
            return oDraftActivate.execute();
          });
        });
      }).then(function () {
        MessageToast.show("Turno confirmado");
        return oTurnoContext.requestRefresh();
      }).catch(function (oError) {
        MessageBox.error("No se pudo confirmar el turno: " + oError.message);
      });
    }

  });
});

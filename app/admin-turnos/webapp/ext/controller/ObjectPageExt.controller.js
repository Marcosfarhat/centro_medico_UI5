sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (ControllerExtension, MessageToast, MessageBox) {
  "use strict";

  return ControllerExtension.extend("centro.medico.admin.adminturnos.ext.controller.ObjectPageExt", {

    metadata: {
      methods: {
        onConfirmarTurno: { public: true, final: true },
        onVolverInicio: { public: true, final: true }
      }
    },

    // Navega de vuelta a la lista de Turnos (la ruta "TurnosList" del manifest),
    // sin depender del botón de "atrás" del navegador.
    onVolverInicio: function () {
      var oRouter = this.base.getAppComponent().getRouter();
      oRouter.navTo("TurnosList");
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
          // No reusamos oDraftEdit.getBoundContext() como base de la próxima acción:
          // ese contexto "recuerda" que vino de una operación (.../draftEdit(...)) y
          // UI5 no permite encadenar otra operación encima ("nested deferred operation
          // bindings"). Pedimos un contexto nuevo y limpio al mismo Paciente en draft,
          // direccionándolo directo por ID + IsActiveEntity=false.
          var oPacienteDraftContext = oModel.bindContext(
            "/Pacientes(ID='" + oTurno.paciente_ID + "',IsActiveEntity=false)"
          ).getBoundContext();

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
          }).catch(function (oStepError) {
            // Si algo falló DESPUÉS de abrir el draft (paso 2), el Paciente queda
            // trabado en edición y nadie más puede tocarlo hasta descartarlo a mano.
            // Lo descartamos automáticamente (igual al botón "Cancel" de la UI) y
            // recién ahí propagamos el error original para que lo vea el usuario.
            return oPacienteDraftContext.delete().catch(function () {
              // si ni el descarte funciona, no hay nada más que hacer acá
            }).then(function () {
              throw oStepError;
            });
          });
        });
      }).then(function () {
        MessageToast.show("Turno confirmado");
        // Refrescamos todo el modelo: como escribimos los datos "por debajo" del
        // framework (llamadas directas al modelo, no el flujo estándar de Save),
        // Fiori Elements no sabe que algo cambió. Esto evita tener que hacer un
        // hard refresh manual para ver el cambio reflejado en la lista al volver.
        return oModel.refresh();
      }).catch(function (oError) {
        MessageBox.error("No se pudo confirmar el turno: " + oError.message);
      });
    }

  });
});

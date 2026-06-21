sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/m/MessageToast"
], function (ControllerExtension, MessageToast) {
  "use strict";

  return ControllerExtension.extend("centro.medico.admin.adminturnos.ext.controller.ObjectPageExt", {

    metadata: {
      methods: {
        onConfirmarTurno: { public: true, final: true }
      }
    },

    onConfirmarTurno: function () {
      var oContext = this.base.getView().getBindingContext();
      var oTurno = oContext.getObject();

      MessageToast.show("Turno confirmado: " + oTurno.motivo);
    }

  });
});

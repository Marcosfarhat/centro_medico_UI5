sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension"
], function (ControllerExtension) {
  "use strict";

  return ControllerExtension.extend("centro.medico.admin.adminpacientes.ext.controller.ObjectPageExt", {

    metadata: {
      methods: {
        onVolverInicio: { public: true, final: true }
      }
    },

    onVolverInicio: function () {
      var oRouter = this.base.getAppComponent().getRouter();
      oRouter.navTo("PacientesList");
    }

  });
});

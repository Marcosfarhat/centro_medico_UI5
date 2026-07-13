sap.ui.define([
  "sap/ui/core/UIComponent"
], function (UIComponent) {
  "use strict";

  // App freestyle: extiende el UIComponent generico (NO sap/fe/core/AppComponent,
  // que es el de Fiori Elements). Nosotros definimos la vista y el controller a mano.
  return UIComponent.extend("centro.medico.paciente.asistente.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
    }
  });
});

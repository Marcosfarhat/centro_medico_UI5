sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'centro.medico.admin.adminmedicos',
            componentId: 'MedicosList',
            contextPath: '/Medicos'
        },
        CustomPageDefinitions
    );
});
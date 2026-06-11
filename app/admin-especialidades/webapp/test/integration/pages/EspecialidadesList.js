sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'centro.medico.admin.adminespecialidades',
            componentId: 'EspecialidadesList',
            contextPath: '/Especialidades'
        },
        CustomPageDefinitions
    );
});
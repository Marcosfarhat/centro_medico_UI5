sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"centro/medico/admin/adminespecialidades/test/integration/pages/EspecialidadesList",
	"centro/medico/admin/adminespecialidades/test/integration/pages/EspecialidadesObjectPage"
], function (JourneyRunner, EspecialidadesList, EspecialidadesObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('centro/medico/admin/adminespecialidades') + '/test/flpSandbox.html#centromedicoadminadminespecial-tile',
        pages: {
			onTheEspecialidadesList: EspecialidadesList,
			onTheEspecialidadesObjectPage: EspecialidadesObjectPage
        },
        async: true
    });

    return runner;
});


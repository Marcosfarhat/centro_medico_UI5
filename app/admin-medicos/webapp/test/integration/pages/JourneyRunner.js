sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"centro/medico/admin/adminmedicos/test/integration/pages/MedicosList",
	"centro/medico/admin/adminmedicos/test/integration/pages/MedicosObjectPage",
	"centro/medico/admin/adminmedicos/test/integration/pages/TurnosObjectPage"
], function (JourneyRunner, MedicosList, MedicosObjectPage, TurnosObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('centro/medico/admin/adminmedicos') + '/test/flp.html#app-preview',
        pages: {
			onTheMedicosList: MedicosList,
			onTheMedicosObjectPage: MedicosObjectPage,
			onTheTurnosObjectPage: TurnosObjectPage
        },
        async: true
    });

    return runner;
});


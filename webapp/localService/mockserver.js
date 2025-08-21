sap.ui.define([
    "sap/ui/core/util/MockServer",
    "sap/base/util/UriParameters"
], function (MockServer, UriParameters) {
    "use strict";

    return {
        init: function () {
            // create
            var oMockServer = new MockServer({
                // Reemplaza "Z_SALIDA_MAT_SRV" con el namespace real si es diferente
                rootUri: "/sap/opu/odata/sap/Z_SALIDA_MAT_SRV/" 
            });

            var oUriParameters = new UriParameters(window.location.href);

            // configure mock server with a delay
            MockServer.config({
                autoRespond: true,
                autoRespondAfter: oUriParameters.get("serverDelay") || 500
            });

            // simulate
            var sPath = sap.ui.require.toUrl("salidademateriales/localService");
            oMockServer.simulate(sPath + "/metadata.xml", {
                sMockdataBaseUrl: sPath + "/mockdata",
                bGenerateMissingMockData: true
            });

            // start
            oMockServer.start();
        }
    };
});
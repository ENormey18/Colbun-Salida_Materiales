// En tu DMSHandler.js
sap.ui.define(["sap/ui/model/json/JSONModel"], function (JSONModel) {
  "use strict";
  const _sREPOSITORY = "ZSAPDMSTEST";
  const _appBaseUrl = jQuery.sap.getModulePath("salidademateriales");
  const _dmsUrl = _appBaseUrl + "/dms/";

  return {
    /**
     * @param {sap.ui.core.Component} oComponent Componente Principal de la App
     */
    init: function (oComponent) {
      this._oComponent = oComponent;

      var oDmsModel = new JSONModel();
      oDmsModel.setProperty("Repository", _sREPOSITORY);
      this._oComponent.setModel(oDmsModel, "dmsModel");
    },

    getFolderContent: async function (sFolderPath) {
      const sUrl = `${_dmsUrl}browser/${_sREPOSITORY}/${sFolderPath}`;

      const resp = await fetch(sUrl, {
        headers: { Accept: "application/json" },
      });

      if (!resp.ok) {
        throw resp;
      } else {
        const respJson = await resp.json();
        const aObjects = respJson.objects || [];
        const aObjIds = aObjects.map((item) => {
          const oProp = item.object.properties || {};
          return {
            Id: oProp["cmis:objectId"]?.value,
            Name: oProp["cmis:name"]?.value,
          };
        });
        return aObjIds;
      }
    },
    getObjectContent: async function (sFolderPath, sObjId) {
      const sUrl = `${_dmsUrl}browser/${_sREPOSITORY}/${sFolderPath}`;
      const params = new URLSearchParams();
      params.append("objectId", sObjId);

      const resp = await fetch(`${sUrl}?${params}`, {
        headers: { Accept: "application/json" },
      });

      if (!resp.ok) {
        console.error(
          `DMS GET failed: ${resp.status} ${resp.statusText}`,
          await resp.text()
        );
        throw resp;
      } else {
        return resp.blob();
      }
    },
    _createFolder: async function (sParentPath, sFolderName) {
      const sUrl = `${_dmsUrl}browser/${_sREPOSITORY}/${sParentPath}`;

      const oFormData = new FormData();

      oFormData.append("cmisaction", "createFolder");
      oFormData.append("propertyId[0]", "cmis:objectTypeId");
      oFormData.append("propertyValue[0]", "cmis:folder");
      oFormData.append("propertyId[1]", "cmis:name");
      oFormData.append("propertyValue[1]", sFolderName);
      oFormData.append("succinct", "false");

      const requestOptions = {
        method: "POST",
        headers: { Accept: "application/json", DataServiceVersion: "2.0" },
        body: oFormData,
        redirect: "follow",
      };

      const oResult = {
        objId: null,
        error: null,
      };

      const oResp = await fetch(sUrl, requestOptions);

      if (!oResp.ok) {
        const message = `Ocurrió un error: ${oResp.status}`;
        oResult.error = message;
      } else {
        const result = await oResp.json();
        oResult.objId = result.properties["cmis:objectId"]?.value;
      }
      return oResp;
    },
    uploadObject: async function (sFolderPath, sObjName, sObjFileName, blob) {
      const sUrl = `${_dmsUrl}browser/${_sREPOSITORY}/${sFolderPath}`;

      const oCheckFolderResp = await fetch(sUrl, {
        headers: { Accept: "application/json" },
      });

      switch (oCheckFolderResp.status) {
        case 404:
          const aPath  = sFolderPath.split("/");
          const sParentPath = aPath.slice(0,-1).join("/");
          console.log("Creando carpeta destino en DMS")
          const oCreateRes = await this._createFolder(sParentPath, aPath[aPath.length-1]);
          if (oCreateRes.error){
            throw new Error(oCreateRes.error);
          }
          break;
        case 401:
          throw new Error("Error Acceso: Token de acceso a DMS Inválido")
        case 500:
          throw new Error("Error Interno: No se pudo comprobar la carpeta destino en DMS");
        default:
          break;
      }

      const oFormData = new FormData();

      oFormData.append("cmisaction", "createDocument");
      oFormData.append("propertyId[0]", "cmis:objectTypeId");
      oFormData.append("propertyValue[0]", "cmis:document");
      oFormData.append("propertyId[1]", "cmis:name");
      oFormData.append("propertyValue[1]", sObjName);
      oFormData.append("filename", sObjFileName);
      oFormData.append("_charset", "UTF-8");
      oFormData.append("includeAllowableActions", "false");
      oFormData.append("succinct", "false");
      oFormData.append("media", blob);

      const requestOptions = {
        method: "POST",
        headers: { Accept: "application/json", DataServiceVersion: "2.0" },
        body: oFormData,
        redirect: "follow",
      };

      const responseResult = {
        objId: null,
        error: null,
      };

      const response = await fetch(sUrl, requestOptions);
      if (!response.ok) {
        responseResult.error = response;
      } else {
        const result = await response.json();
        responseResult.objId = result.properties["cmis:objectId"]?.value;
      }
      return responseResult;
    },
  };
});

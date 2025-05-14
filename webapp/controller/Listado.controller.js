sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
], (Controller, Filter, FilterOperator, MessageToast) => {
    "use strict";

    return Controller.extend("salidademateriales.controller.Listado", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteListado").attachPatternMatched(this.onRouteMatched, this);
        },
        onRouteMatched(oEvent) {
            const args = oEvent.getParameter("arguments");
            const queries = args['?query'];
            if (!queries){
                const localModel = this.getView().getModel("LocalModel");
                const reservas = localModel.getProperty("/reservas");
                localModel.setProperty("/filteredReservas", reservas)
                return;
            };
            const { materialFrom, materialTo, centro } = queries;
            this.filterLocalModel(parseInt(materialFrom), parseInt(materialTo), centro);
        },
        isMaterialInRange(material, materialFrom, materialTo){
            const materialId = parseInt(material?.id);
            if(!material || isNaN(materialId)) throw "Invalid or missing material";
            const isMaterialFromNaN = isNaN(materialFrom);
            const isMaterialToNaN = isNaN(materialTo);
            if(isMaterialFromNaN && isMaterialToNaN) return true;
            if(isMaterialFromNaN && !isMaterialToNaN) return materialId <= materialTo;
            if(!isMaterialFromNaN && isMaterialToNaN) return materialId >= materialFrom;
            return materialId >= materialFrom && materialId <= materialTo;
        },
        filterLocalModel(materialFrom, materialTo, centro){
            const localModel = this.getView().getModel("LocalModel");
            const reservas = localModel.getProperty("/reservas");
            const materialFromInt = parseInt(materialFrom);
            const materialToInt = parseInt(materialTo);
            const filteredReservas = reservas.filter(r => {
                const matchesCentro = !centro || r.center === centro;
                let matchesMaterial;
                if(isNaN(materialFromInt) && isNaN(materialToInt)) matchesMaterial = true;
                else matchesMaterial = r.materiales?.some(m => this.isMaterialInRange(m, materialFromInt, materialToInt));
                return matchesCentro && matchesMaterial;
            });
            localModel.setProperty("/filteredReservas", filteredReservas);
        },
        onSearch(oEvent) {
            const generalFilterValue = this.getFilterValue("generalFilter");
            const ordenFilterValue = this.getFilterValue("ordenFilter");
            const pocNacFilterValue = this.getFilterValue("pocNacFilter");
            const mainTableBinding = this.byId("mainTable").getBinding("items");
            const aFilters = [];
            if (generalFilterValue) aFilters.push(this.getGeneralFilter(generalFilterValue));
            if (ordenFilterValue) aFilters.push(this.getOrdenFilter(ordenFilterValue));
            if (pocNacFilterValue) aFilters.push(this.getPocNacFilter(pocNacFilterValue));
            const totalFilter = new Filter({
                filters: aFilters,
                and: true
            });
            mainTableBinding.filter(totalFilter);
        },
        getFilterValue(id) {
            return this.byId(id)?.getValue() || "";
        },
        getGeneralFilter(generalFilterValue) {
            const generalFilter = new Filter({
                filters: [
                    new Filter('orderId', FilterOperator.Contains, generalFilterValue),
                    new Filter('state', FilterOperator.Contains, generalFilterValue),
                    new Filter('changedOn', FilterOperator.Contains, generalFilterValue),
                    new Filter('customer', FilterOperator.Contains, generalFilterValue),
                    new Filter('customerContact', FilterOperator.Contains, generalFilterValue),
                    new Filter('quantity', FilterOperator.Contains, generalFilterValue),
                    new Filter('netAmount', FilterOperator.Contains, generalFilterValue),
                    new Filter('currency', FilterOperator.Contains, generalFilterValue),
                ],
            })
            return generalFilter;
        },
        getOrdenFilter(ordenFilterValue) {
            return new Filter("orderId", FilterOperator.Contains, ordenFilterValue);
        },
        getPocNacFilter(pocNacFilterValue) {
            return new Filter("changedOn", FilterOperator.EQ, pocNacFilterValue);
        },
        onClear() {
            const filterBar = this.byId("filterBar");
            filterBar.getAllFilterItems()?.forEach(i => i.getControl()?.setValue(''));
            filterBar.fireSearch();
        },
        onItemPress(oEvent) {
            const localModel = this.getView().getModel("LocalModel");
            const bindingContext = oEvent.oSource.getBindingContext("LocalModel");
            const bindingPath = bindingContext?.sPath;
            if(!bindingPath) return MessageToast.show("Error al mostrar reserva");
            const reserva = localModel.getProperty(bindingPath);
            if (!reserva) return MessageToast.show("Error al mostrar reserva");
            this.getOwnerComponent().getRouter().navTo("RouteDetails", {
                reservaId: reserva.id
            });
        },
    });
});
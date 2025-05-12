sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("salidademateriales.controller.Listado", {
        onInit() {},
        onSearch(oEvent){
            const generalFilterValue = this.getFilterValue("generalFilter");
            const ordenFilterValue = this.getFilterValue("ordenFilter");
            const pocNacFilterValue = this.getFilterValue("pocNacFilter");
            const mainTableBinding = this.byId("mainTable").getBinding("items");
            const aFilters = [];
            if(generalFilterValue) aFilters.push(this.getGeneralFilter(generalFilterValue));
            if(ordenFilterValue) aFilters.push(this.getOrdenFilter(ordenFilterValue));
            if(pocNacFilterValue) aFilters.push(this.getPocNacFilter(pocNacFilterValue));
            const totalFilter = new Filter({
                filters: aFilters,
                and: true
            });
            mainTableBinding.filter(totalFilter);
        },
        getFilterValue(id){
            return this.byId(id)?.getValue() || "";
        },
        getGeneralFilter(generalFilterValue){
            const generalFilter = new Filter({
                filters:[
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
        getOrdenFilter(ordenFilterValue){
            return new Filter("orderId", FilterOperator.Contains, ordenFilterValue);
        },
        getPocNacFilter(pocNacFilterValue){
            return new Filter("changedOn", FilterOperator.EQ, pocNacFilterValue);
        },
        onClear(){
            const filterBar = this.byId("filterBar");
            filterBar.getAllFilterItems()?.forEach(i => i.getControl()?.setValue(''));
            filterBar.fireSearch();
        },
        onItemPress(oEvent){
            const localModel = this.getView().getModel("LocalModel");
            const bindingPath = oEvent?.oSource?.getBindingContextPath();
            const reserva = localModel.getProperty(bindingPath);
            if(!reserva) return;
            this.getOwnerComponent().getRouter().navTo("RouteDetails", {
                reservaId: reserva.orderId
            });
        },
    });
});
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Sorter",
    "../model/formatter",
  ],
  (
    Controller,
    Filter,
    FilterOperator,
    MessageToast,
    Fragment,
    JSONModel,
    Sorter,
    formatter
  ) => {
    "use strict";

    return Controller.extend("salidademateriales.controller.Listado", {
      formatter: formatter,
      onInit() {
        const oView = this.getView();

        let aCentros = [];
        const oModel = this.getOwnerComponent().getModel();
        this.__loadWerks(oModel)
          .then((aCentros) => {
            const oModelR = new JSONModel({
              ReservaSet: [],
              filters: {
                reserva: "",
                fechaFrom: "",
                fechaTo: "",
                materialFrom: "",
                materialTo: "",
                centros: [],
                status: "O",
              },
              centros: aCentros,
            });
            oView.setModel(oModelR, "Reservas");
            this.openInitialFilters();
          })
          .catch((err) => {
            console.error("Error en la llamada OData:", err);
            MessageToast.show(
              "Ocurrió un error al buscar los datos de centros."
            );
          });
      },
      async openInitialFilters() {
        if (!this.initialFiltersDialog) {
          this.initialFiltersDialog = await Fragment.load({
            name: "salidademateriales.view.fragments.listado.dialogs.InitialFilters",
            controller: this,
            id: "initialFilters",
          }).then((oInitialFiltersDialog) => {
            this.getView().addDependent(oInitialFiltersDialog);
            return oInitialFiltersDialog;
          });
        }
        this.initialFiltersDialog.open();
      },
      onSetFromDate(oEvent) {
        const oDatePickerFrom = oEvent.getSource(); 
        const oFromDate = oDatePickerFrom.getDateValue(); 
        const oReservasModel = this.getView().getModel("Reservas");
        const oFilters = oReservasModel.getProperty("/filters");

        if (oFilters.status === "C" && oFromDate) {
          const oToDate = new Date(oFromDate);
          oToDate.setFullYear(oToDate.getFullYear() + 1); 
          oReservasModel.setProperty("/filters/fechaTo", oToDate.toISOString().slice(0,10));
        }
      },
      __loadWerks(oModel) {
        return new Promise(function (resolve, reject) {
          oModel.read("/CentroSet", {
            success: function (oData) {
              resolve(oData.results);
            },
            error: function (oError) {
              reject(oError);
            },
          });
        });
      },
      onSearch() {
        if (!this.__validateFilters()) {
          return;
        }
        const oDataModel = this.getOwnerComponent().getModel();
        const oView = this.getView();
        const reservasModel = oView.getModel("Reservas");
        this.byId("reservasTable").setBusy(true);
        const aFilters = this.__getReservasFilters();
        oDataModel.read("/ReservaSet", {
          filters: aFilters,

          success: function (oData) {
            oData.results.forEach((reserva) => {
              let aux = reserva.BaseDate;
              if (aux) {
                reserva.BaseDate = aux.toISOString().slice(0, 10);
              }
              aux = reserva.ReqDate;
              if (aux) {
                reserva.ReqDate = aux.toISOString().slice(0, 10);
              }
            });
            reservasModel.setProperty("/ReservaSet", oData.results);
            this.byId("reservasTable").setBusy(false);
          }.bind(this),
          error: function (oError) {
            console.error("Error en la llamada OData:", oError);
            MessageToast.show("Ocurrió un error al buscar los datos.");
            this.byId("reservasTable").setBusy(false);
          }.bind(this),
        });

        this.initialFiltersDialog.close();
        const oTable = this.byId("reservasTable");
        const oBinding = oTable.getBinding("items");
        oBinding.filter([]);
      },
      onCloseInitialFilters() {
        this.initialFiltersDialog.close();
      },
      __validateFilters() {
        const oReservasModel = this.getView().getModel("Reservas");
        const oFilters = oReservasModel.getProperty("/filters");
        if (
          oFilters.materialFrom &&
          oFilters.materialTo &&
          parseInt(oFilters.materialFrom) > parseInt(oFilters.materialFrom)
        ) {
          MessageToast.show("El rango de materiales es inválido");
          return false;
        }
        if (
          oFilters.fechaFrom &&
          oFilters.fechaTo &&
          oFilters.fechaFrom > oFilters.fechaTo
        ) {
          MessageToast.show("El rango de fechas es inválido");
          return false;
        }
        if (oFilters.status === "C" && !oFilters.reserva.trim()) {
          if (
            !oFilters.fechaFrom ||
            !oFilters.fechaTo ||
            oFilters.fechaFrom === "" ||
            oFilters.fechaTo === ""
          ) {
            MessageToast.show(
              "Debe especificar un rango de fechas para las reservas completadas"
            );
            return false;
          }
          const dateFrom = new Date(oFilters.fechaFrom);
          const dateTo = new Date(oFilters.fechaTo);
          if (isNaN(dateFrom) || isNaN(dateTo)) {
            sap.m.MessageToast.show("Fechas inválidas");
            return false;
          }
          const iDiffMs = dateTo - dateFrom;
          const iDiffDays = Math.ceil(iDiffMs / (1000 * 60 * 60 * 24));
          if (iDiffDays > 366) {
            MessageToast.show(
              "El rango máximo permitido para reservas completadas es un año"
            );
            return false;
          }
        }
        return true;
      },
      __getReservasFilters() {
        const oView = this.getView();
        const reservasModel = oView.getModel("Reservas");
        const filters = reservasModel.getProperty("/filters");
        const aFilter = [];
        if (filters.reserva)
          aFilter.push(
            new Filter({
              path: "Id",
              operator: FilterOperator.EQ,
              value1: String(parseInt(filters.reserva.trim())),
            })
          );
        if (filters.orden)
          aFilter.push(
            new Filter({
              path: "Orden",
              operator: FilterOperator.EQ,
              value1: String(parseInt(filters.orden.trim())),
            })
          );
        if (filters.fechaFrom && filters.fechaTo)
          aFilter.push(
            new Filter({
              path: "ReqDate",
              operator: FilterOperator.BT,
              value1: filters.fechaFrom,
              value2: filters.fechaTo,
            })
          );
        else if (filters.fechaFrom)
          aFilter.push(
            new Filter({
              path: "ReqDate",
              operator: FilterOperator.GE,
              value1: filters.fechaFrom,
            })
          );
        else if (filters.fechaTo)
          aFilter.push(
            new Filter({
              path: "ReqDate",
              operator: FilterOperator.LE,
              value1: filters.fechaTo,
            })
          );

        if (filters.materialFrom && filters.materialTo) {
          aFilter.push(
            new Filter({
              path: "Material",
              operator: FilterOperator.BT,
              value1: filters.materialFrom.trim().padStart(18, "0"),
              value2: filters.materialTo.trim().padStart(18, "0"),
            })
          );
        } else if (filters.materialFrom) {
          aFilter.push(
            new Filter({
              path: "Material",
              operator: FilterOperator.GE,
              value1: filters.materialFrom.trim().padStart(18, "0"),
            })
          );
        } else if (filters.materialTo) {
          aFilter.push(
            new Filter({
              path: "Material",
              operator: FilterOperator.LE,
              value1: filters.materialTo.trim().padStart(18, "0"),
            })
          );
        }
        if (filters.centros.length !== 0) {
          const aCentrosFilter = [];
          filters.centros.forEach((sCentro) => {
            aCentrosFilter.push(
              new Filter({
                path: "Centro",
                operator: FilterOperator.EQ,
                value1: sCentro,
              })
            );
          });
          aFilter.push(new Filter({ filters: aCentrosFilter, and: false }));
        }
        if (filters.status) {
          aFilter.push(
            new Filter({
              path: "Status",
              operator: FilterOperator.EQ,
              value1: filters.status,
            })
          );
        }
        return aFilter;
      },
      onClear() {
        const oReservasModel = this.getView().getModel("Reservas");
        oReservasModel.setProperty("/filters", {
          reserva: "",
          fechaFrom: "",
          fechaTo: "",
          materialFrom: "",
          materialTo: "",
          centros: [],
          status: "O",
        });
        this.byId("combo-centros").removeAllSelectedItems();
        //this.onSearch();
      },
      onFiltrarTable: function (oEvent) {
        const sQuery = oEvent.getParameter("query").trim()?.toUpperCase();
        const aFilters = [];

        if (sQuery && sQuery.length > 0) {
          // Crear un filtro compuesto con OR.
          // Este filtro buscará la cadena sQuery en CUALQUIERA de los campos especificados.
          const oGlobalFilter = new Filter({
            filters: [
              new Filter("Id", FilterOperator.Contains, sQuery),
              new Filter("Orden", FilterOperator.Contains, sQuery),
              new Filter("Usuario", FilterOperator.Contains, sQuery),
              new Filter("Dest", FilterOperator.Contains, sQuery),
              new Filter("Centro", FilterOperator.Contains, sQuery),
              new Filter("ReqDate", FilterOperator.Contains, sQuery),
            ],
            and: false,
          });
          aFilters.push(oGlobalFilter);
        }

        const oTable = this.byId("reservasTable");
        const oBinding = oTable.getBinding("items");
        oBinding.filter(aFilters);
      },
      _bDescendingSort: false,
      _sCurrentSortProperty: "Id",
      onSort: function (oEvent) {
        const sSortProperty = oEvent.getSource().data("sortProperty");
        if (this._sCurrentSortProperty === sSortProperty) {
          this._bDescendingSort = !this._bDescendingSort;
        } else {
          this._bDescendingSort = false;
        }
        this._sCurrentSortProperty = sSortProperty;

        let oSorter;
        if (sSortProperty === "Id" || sSortProperty === "Orden") {
          oSorter = new Sorter(
            sSortProperty,
            this._bDescendingSort,
            false,
            function (a, b) {
              // Función de comparación para ordenar numéricamente
              const numA = parseInt(a, 10);
              const numB = parseInt(b, 10);

              if (isNaN(numA) || isNaN(numB)) {
                // Manejar casos donde el valor no es un número
                if (a < b) return -1;
                if (a > b) return 1;
                return 0;
              }

              if (numA < numB) return -1;
              if (numA > numB) return 1;
              return 0;
            }
          );
        } else {
          oSorter = new Sorter(sSortProperty, this._bDescendingSort);
        }

        const oTable = this.byId("reservasTable");
        const oBinding = oTable.getBinding("items");
        oBinding.sort(oSorter);

        this._updateSortIndicator(oEvent.getSource());
      },
      _updateSortIndicator: function (oPressedButton) {
        const oTable = this.byId("reservasTable");
        oTable.getColumns().forEach(function (oColumn) {
          const oHeader = oColumn.getHeader();
          if (oHeader instanceof sap.m.Button) {
            oHeader.setIcon("sap-icon://sort");
          }
        });
        const sNewIcon = this._bDescendingSort
          ? "sap-icon://sort-descending"
          : "sap-icon://sort-ascending";
        oPressedButton.setIcon(sNewIcon);
      },
      onItemPress(oEvent) {
        const oBindingContext = oEvent
          .getSource()
          .getBindingContext("Reservas");
        const oSelectedReserva = oBindingContext.getObject();
        if (!oSelectedReserva) {
          sap.m.MessageToast.show("Error al obtener los datos de la reserva.");
          return;
        }
        this.getOwnerComponent().getRouter().navTo("RouteDetails", {
          reservaId: oSelectedReserva.Id,
        });
      },
    });
  }
);

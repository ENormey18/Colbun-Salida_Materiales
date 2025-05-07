/*global QUnit*/

sap.ui.define([
	"salidademateriales/controller/Listado.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Listado Controller");

	QUnit.test("I should test the Listado controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});

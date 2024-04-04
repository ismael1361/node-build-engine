(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["demo"] = factory();
	else
		root["demo"] = factory();
})(this, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;


Object.defineProperty(exports, "__esModule", ({
    value: true
}));
function apenasUmaFuncao() {
    console.log("apenasUmaFuncao::browser");
}
exports.apenasUmaFuncao = apenasUmaFuncao;
//# sourceMappingURL=browser.js.map
})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
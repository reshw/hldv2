// Minimal DOM/localStorage stub to exercise the ballistics.html script logic headlessly.
function fakeEl() {
  return {
    innerHTML: "",
    textContent: "",
    placeholder: "",
    addEventListener: function () {},
    getAttribute: function () { return null; },
    setAttribute: function () {},
    select: function () {},
    focus: function () {},
    querySelectorAll: function () { return []; },
    value: "0",
  };
}
global.document = {
  getElementById: function () { return fakeEl(); },
  querySelectorAll: function () { return []; },
};
global.localStorage = {
  _s: {},
  getItem: function (k) { return this._s[k] || null; },
  setItem: function (k, v) { this._s[k] = v; },
};
global.confirm = function () { return false; };

const fs = require("fs");
const code = fs.readFileSync(__dirname + "/_extracted.js", "utf8");
eval(code);

// After the IIFE runs renderAll() once via its own bottom call, do extra manual checks:
console.log("If you see this, the top-level IIFE (incl. renderAll()) ran without throwing.");

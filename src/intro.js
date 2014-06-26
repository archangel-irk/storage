/**
 * STRORAGE
 * вдохновлён mongoose 3.8.4 (исправлены баги по 3.8.12)
 */
!function(){
  var storage;
  // CommonJS/Node.js
  if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
    storage = module['exports'] || exports; // module.exports is for Node.js
  } else {
    storage = window['storage'] = {}
  }
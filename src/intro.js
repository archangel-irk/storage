/**
 * STRORAGE
 * вдохновлён mongoose 3.8.4 (по состоянию на 3.8.7 - ничего нужного для хранилища не изменилось)
 */
!function(){
  var storage;
  // CommonJS/Node.js
  if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
    storage = module['exports'] || exports; // module.exports is for Node.js
  } else {
    storage = window['storage'] = {}
  }
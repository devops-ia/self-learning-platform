#!/usr/bin/env node

const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '3000', 10);

// Monkey-patch http.Server.prototype.listen to force binding to HOST:PORT
const http = require('http');
const net = require('net');
const originalListen = http.Server.prototype.listen;

let listenCalled = false;

http.Server.prototype.listen = function listener(...args) {
  // Only intercept the first call
  if (!listenCalled) {
    listenCalled = true;
    // Clear all args and set our own
    args = [PORT, HOST];
  }
  return originalListen.apply(this, args);
};

// Now load server.js which will use our patched listen method
require('../server.js');

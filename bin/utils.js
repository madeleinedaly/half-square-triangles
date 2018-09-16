'use strict';
const tempy = require('tempy');
const path = require('path');
const fs = require('fs');

const getid = () => Math.random().toString(36).slice(2);

const mktempdir = debug => {
  let dir;
  if (debug) {
    dir = path.resolve('./tmp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  } else {
    dir = tempy.directory();
  }
  return dir;
};

module.exports = {
  getid,
  mktempdir
};

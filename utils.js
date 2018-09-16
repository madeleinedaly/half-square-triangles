'use strict';
const tempy = require('tempy');
const fs = require('fs');
const path = require('path');
const util = require('util');
const {execFile} = require('child_process');

const execFileAsync = util.promisify(execFile);

const id = () => Math.random().toString(36).slice(2);

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
  id,
  execFileAsync,
  mktempdir
};

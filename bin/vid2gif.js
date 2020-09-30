#!/usr/bin/env node
'use strict';
const execa = require('execa');
const meow = require('meow');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const {
  getid,
  mktempdir
} = require('./utils');

const defaults = {
  debug: false,
  optimize: false,
};

const options = {
  description: 'Convert a video file to a gif',
  help: `
Usage:
  ${path.basename(process.argv[1])} <file> [options]

Options:
  -o --optimize  Optimize gif output. [default: ${defaults.optimize}]
  -d --debug     Enable debugging features. [default: ${defaults.debug}]
  -h --help      Print this message and exit.`,
  inferType: true,
  flags: {
    debug: {type: 'boolean', alias: 'd', default: defaults.debug},
    optimize: {type: 'boolean', alias: 'o', default: defaults.optimize},
  },
};

(async cli => {
  if (cli.flags.h) cli.showHelp(0);
  if (cli.input.length < 1) cli.showHelp(2);

  const modes = {
    debug: cli.flags.debug,
  };

  const spinner = ora();
  const tempdir = mktempdir(modes.debug);
  const output = path.resolve();
})(meow(options));

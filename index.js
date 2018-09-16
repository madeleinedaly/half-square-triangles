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
  output: 'out.png',
  size: 145,
  debug: false
};

const options = {
  help: `
Usage:
  ${process.argv[1]} <file1> <file2> [-o <outfile> -s <size>]
Options:
  -o --output <outfile>  Set output file name. [default: ${defaults.output}]
  -s --size <size>       Set square length. [default: ${defaults.size}]
  -d --debug             Enable debugging features. [default: ${defaults.debug}]
  -h --help              Print this message and exit.`,
  inferType: true,
  flags: {
    output: {type: 'string', alias: 'o', default: defaults.output},
    size: {type: 'number', alias: 's', default: defaults.size},
    debug: {type: 'boolean', alias: 'd', default: defaults.debug}
  }
};

// http://www.imagemagick.org/discourse-server/viewtopic.php?t=14104

(async cli => {
  if (cli.flags.h) cli.showHelp(0);
  if (cli.input.length !== 2) cli.showHelp(2);

  const tempdir = mktempdir(cli.flags.debug);
  const {size} = cli.flags;
  const spinner = ora();
  const files = {
    mask: `mask-${size}.png`,
    crop1: `crop-${getid()}.png`,
    crop2: `crop-${getid()}.png`,
    triangle1: `triangle-${getid()}.png`,
    triangle2: `triangle-${getid()}.png`
  };

  for (const [key, value] of Object.entries(files)) {
    files[key] = path.resolve(tempdir, value);
  }

  if (cli.flags.debug) {
    spinner.warn(' Debug mode enabled');
  }

  if (fs.existsSync(files.mask)) {
    spinner.start(' Found a mask');
  } else {
    spinner.start(' Generating mask');

    await execa('magick', [
      '-size', `${size}x${size}`,
      'xc:black',
      '-fill', 'white',
      '-draw', `polygon 0,0 0,${size} ${size},0`,
      files.mask
    ]);
  }

  spinner
    .succeed()
    .start(' Cropping images');

  await Promise.all([
    execa('magick', [cli.input[0], '-crop', `${size}x${size}+0+0`, '+repage', files.crop1]),
    execa('magick', [cli.input[1], '-crop', `${size}x${size}+0+0`, '+repage', files.crop2])
  ]);

  spinner
    .succeed()
    .start(' Masking cropped images');

  await Promise.all([
    execa('magick', [
      files.crop1,
      files.mask,
      '-alpha', 'off',
      '-compose', 'copy_opacity',
      '-composite', files.triangle1
    ]),

    execa('magick', [
      '-respect-parenthesis',
      files.crop2,
      '\(', files.mask, '-negate', '\)',
      '-alpha', 'off',
      '-compose', 'copy_opacity',
      '-composite', files.triangle2
    ])
  ]);

  spinner
    .succeed()
    .start(' Compositing masked images');

  await execa('magick', [
    files.triangle1,
    files.triangle2,
    '-compose', 'over',
    '-composite', cli.flags.output
  ]);

  spinner
    .succeed()
    .stopAndPersist({
      symbol: '✨',
      text: 'Done'
    });
})(meow(options));

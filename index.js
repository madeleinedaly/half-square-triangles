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
  ${path.basename(process.argv[1])} <file1> [<file2> -o <outfile> -s <size>]

Passing only one input file renders one of the triangles transparent.

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
  if (cli.input.length < 1) cli.showHelp(2);

  const modes = {
    buffer: cli.input.length === 1,
    debug: cli.flags.debug
  };

  const tempdir = mktempdir(modes.debug);
  const {size} = cli.flags;
  const spinner = ora();
  const files = {
    mask: `mask-${size}.png`,
    buffer: `buffer-${size}.png`,
    crop1: `crop-${getid()}.png`,
    crop2: `crop-${getid()}.png`,
    triangle1: `triangle-${getid()}.png`,
    triangle2: `triangle-${getid()}.png`
  };

  for (const [key, value] of Object.entries(files)) {
    files[key] = path.resolve(tempdir, value);
  }

  if (cli.flags.debug) {
    spinner.warn(' Debug enabled');
  }

  if (fs.existsSync(files.mask)) {
    spinner.start(' Found mask');
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

  if (modes.buffer) {
    if (fs.existsSync(files.buffer)) {
      spinner
        .succeed()
        .start(' Found buffer');
    } else {
      spinner
        .succeed()
        .start(' Generating buffer');

      execa('magick', [
        '-size', `${size}x${size}`,
        'xc:none', files.buffer
      ]);
    }
  }

  spinner
    .succeed()
    .start(' Cropping');

  await Promise.all([
    execa('magick', [
      cli.input[0],
      '-crop', `${size}x${size}+0+0`,
      '+repage', files.crop1
    ]),

    modes.buffer ? Promise.resolve() : execa('magick', [
      cli.input[1],
      '-crop', `${size}x${size}+0+0`,
      '+repage', files.crop2
    ])
  ]);

  spinner
    .succeed()
    .start(' Masking');

  await Promise.all([
    execa('magick', [
      files.crop1,
      files.mask,
      '-alpha', 'off',
      '-compose', 'copy_opacity',
      '-composite', files.triangle1
    ]),

    modes.buffer ? Promise.resolve() : execa('magick', [
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
    .start(' Compositing');

  await execa('magick', [
    files.triangle1,
    modes.buffer ? files.buffer : files.triangle2,
    '-compose', 'over',
    '-composite', cli.flags.output
  ]);

  spinner
    .succeed()
    .stopAndPersist({symbol: '✨', text: 'Done'});
})(meow(options));

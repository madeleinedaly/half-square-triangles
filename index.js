#!/usr/bin/env node
'use strict';
const execFile = require('util').promisify(require('child_process').execFile);
const meow = require('meow');
const {description} = require('./package.json');

const magick = (...args) => execFile('magick', args);
const remove = (...args) => execFile('rm', args);
const id = () => Math.random().toString(36).slice(2);

const defaults = {
  output: 'out.png',
  size: 145
};

const options = {
  description,
  help: `
Usage:
  ${process.argv[1]} <file1> <file2> [-o <outfile> -s <size>]
Options:
  -o --output <outfile>  Set output file name. [default: ${defaults.output}]
  -s --size <size>       Set square length. [default: ${defaults.size}]
  -x --debug             Enable debugging features.
  -h --help              Print this message and exit.`,
  flags: {
    output: {type: 'string', alias: 'o', default: defaults.output},
    size: {type: 'number', alias: 's', default: defaults.size}
  }
};

(async cli => {
  if (cli.flags.h) cli.showHelp(0);
  if (cli.input.length !== 2) cli.showHelp(2);

  const [input1, input2] = cli.input;
  const {size} = cli.flags;
  const id1 = id();
  const id2 = id();
  const files = {
    mask: `mask-${size}.png`,
    crop1: `crop-${id1}.png`,
    crop2: `crop-${id2}.png`,
    triangle1: `triangle-${id1}.png`,
    triangle2: `triangle-${id2}.png`
  };

  await Promise.all([
    magick(
      '-size', `${size}x${size}`,
      'xc:black',
      '-fill', 'white',
      '-draw', `polygon 0,0 0,${size} ${size},0`,
      files.mask
    ),
    magick(input1, '-crop', `${size}x${size}+0+0`, '+repage', files.crop1),
    magick(input2, '-crop', `${size}x${size}+0+0`, '+repage', files.crop2)
  ]);

  await Promise.all([
    magick(
      files.crop1,
      files.mask,
      '-alpha', 'off',
      '-compose', 'copy_opacity',
      '-composite', files.triangle1
    ),
    magick(
      '-respect-parenthesis',
      files.crop2,
      '\(', files.mask, '-negate', '\)',
      '-alpha', 'off',
      '-compose', 'copy_opacity',
      '-composite', files.triangle2
    )
  ]);

  await magick(
    files.triangle1,
    files.triangle2,
    '-compose', 'over',
    '-composite', cli.flags.output
  );

  await Promise.all(Object.values(files).map(file => remove(file)));
})(meow(options));

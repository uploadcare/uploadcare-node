#!/usr/bin/env node
var fs = require('fs')
var argv = require('minimist')(process.argv.slice(2))

if (argv.version || argv.v) {
  console.log('v' + require('../package.json').version)
  process.exit()
}

if (argv.usage || argv.help || argv.h || !argv._[0]) {
  console.log(fs.readFileSync(__dirname + '/usage.txt', 'utf8'))
  process.exit()
}

var publicKey = argv.pub || argv.u

if (!publicKey) {
  console.log('Missing public key. Use --pub to specify.')
  process.exit()
}

var privateKey = argv.priv || argv.r

if (!privateKey) {
  console.log('Missing private key. Use --priv to specify.')
  process.exit()
}

var uc = require('../')(publicKey, privateKey)

var commands = {
  i: getInfo,
  info: getInfo
}

if (!commands[argv._[0]]) {
  console.log('Unknown command', argv._[0])
  process.exit()
}

commands[argv._[0]]() // Go!

function getInfo () {
  var uuids = argv._.slice(1)

  uuids.forEach(function (uuid) {
    if (uuid.indexOf('~') > -1) {
      uc.groups.info(uuid, callback)
    } else {
      uc.files.info(uuid, callback)
    }
  })

  function callback (err, info) {
    if (err) return console.error(err)
    if (argv.pretty || argv.p) {
      console.log(JSON.stringify(info, null, 2))
    } else {
      console.log(JSON.stringify(info))
    }
  }
}

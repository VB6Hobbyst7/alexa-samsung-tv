const WebSocket = require('ws')
const config = require('../config')
const chalk = require('chalk')
const wakeOnLan = require('wake_on_lan')
const dotenv = require('dotenv')
dotenv.config()

const TV_IP = process.env.TV_IP
const TV_MAC = process.env.TV_MAC
const APP_NAME = process.env.APP_NAME

function powerOnOverLan(done) {
  wakeOnLan.wake(TV_MAC, function(error) {
    if (!error) {
      console.info(chalk.green('Powered on using WOL'))
      return
    }
    console.error(chalk.red('WOL failed'))
  })
}

module.exports = function(key, done) {
  const ws = new WebSocket(
    `http://${TV_IP}:8001/api/v2/channels/samsung.remote.control?name=${APP_NAME}`,
    function(error) {
      console.error(chalk.red(error))
    }
  )

  let connectTimeout = setTimeout(() => {
    if (key === 'KEY_POWER') {
      ws.close()
      powerOnOverLan()
      return
    }
    throw new Error('Could not power on')
  }, 2000)

  ws.on('error', function(e) {
    console.error(chalk.red('Error in sendKey WebSocket communication'))
    done(e)
  })

  ws.on('message', function(data, flags) {
    clearTimeout(connectTimeout)
    const cmd = {
      method: 'ms.remote.control',
      params: {
        Cmd: 'Click',
        DataOfCmd: key,
        Option: 'false',
        TypeOfRemote: 'SendRemoteKey'
      }
    }
    data = JSON.parse(data)
    if (data.event === 'ms.channel.connect') {
      console.info(chalk.green(`Sent ${key} over websocket`))
      ws.send(JSON.stringify(cmd))
      setTimeout(function() {
        ws.close()
        console.info(chalk.grey('websocket closed'))
      }, 1000)
      done(0)
    }
  })
}

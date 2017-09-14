const WebSocket = require('ws')
const chalk = require('chalk')
const wakeOnLan = require('wake_on_lan')
const dotenv = require('dotenv')
dotenv.config()

const TV_IP = process.env.TV_IP
const TV_MAC = process.env.TV_MAC
const APP_NAME = process.env.APP_NAME

// Power on TV using Wake On Lan (WOL) protocol.
function powerOnOverLan(done) {
  wakeOnLan.wake(TV_MAC, function(error) {
    if (error) {
      console.error(chalk.red('Wake on Lan (WOL) failed'))
      return
    }
    console.info(chalk.green('Powered on using Wake On Lan (WOL)'))
  })
}

module.exports = function(key, done) {
  // Create WebSocket object.
  const ws = new WebSocket(
    `http://${TV_IP}:8001/api/v2/channels/samsung.remote.control?name=${APP_NAME}`,
    function(error) {
      console.error(chalk.red(error))
    }
  )

  // Start WebSocet connection timeout. If WebSocket fails to connect before timeout, close WebSocket and power on over WOL.
  let connectTimeout = setTimeout(() => {
    if (key === 'KEY_POWER') {
      ws.close()
      powerOnOverLan()
      return
    }
    throw new Error('Could not power on')
  }, 5000)

  // Handle WebSocket communication error.
  ws.on('error', function(e) {
    console.error(chalk.red('Error in sendKey WebSocket communication'))
    done(e)
  })

  ws.on('message', function(data, flags) {
    // WebSocket connection successful, clear timeout which would otherise trigger WOL.
    clearTimeout(connectTimeout)

    // Define webSocket message object.
    const cmd = {
      method: 'ms.remote.control',
      params: {
        Cmd: 'Click',
        DataOfCmd: key,
        Option: 'false',
        TypeOfRemote: 'SendRemoteKey'
      }
    }

    // Parse message recieved from TV.
    data = JSON.parse(data)

    // Connection message recieved from TV.
    if (data.event === 'ms.channel.connect') {
      console.info(chalk.green(`Sent ${key} over websocket`))

      // Stringify message object and send over WebSocket.
      ws.send(JSON.stringify(cmd))

      // Close WebSocket once message object has been sent.
      setTimeout(function() {
        ws.close()
        console.info(chalk.grey('websocket closed'))
      }, 5000)
      done(0)
    }
  })
}

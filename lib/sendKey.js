const WebSocket = require('ws')
const config = require('../config')
const wakeOnLan = require('wake_on_lan')

function powerOnOverLan(done) {
  wakeOnLan.wake(config.mac, function(error) {
    if (!error) {
      console.info('Powered on using WOL')
      return
    }
    console.error('WOL failed')
  })
}

module.exports = function(key, done) {
  const ws = new WebSocket(
    `http://${config.ip}:8001/api/v2/channels/samsung.remote.control?name=${config.appName}`,
    function(error) {
      console.error(error)
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
    console.error('Error in sendKey WebSocket communication')
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
      console.info(`Sent ${key} over websocket`)
      ws.send(JSON.stringify(cmd))
      setTimeout(function() {
        ws.close()
        console.log('websocket closed')
      }, 1000)
      done(0)
    }
  })
}

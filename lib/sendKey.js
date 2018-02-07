const WebSocket = require('ws')
const chalk = require('chalk')
const wakeOnLan = require('wake_on_lan')
const dotenv = require('dotenv')
const { promisify } = require('util')
dotenv.config()

const TV_IP = process.env.TV_IP
const TV_MAC = process.env.TV_MAC
const APP_NAME = process.env.APP_NAME

let ws = null

// Power on TV using Wake On Lan (WOL) protocol.
const wakeOnLanAsync = promisify(wakeOnLan.wake)
const powerOnOverLan = async () => wakeOnLanAsync(TV_MAC)

const openSocket = async () => {
  return new Promise((resolve, reject) => {
    // Create WebSocket object.
    const ws = new WebSocket(`http://${TV_IP}:8001/api/v2/channels/samsung.remote.control?name=${APP_NAME}`, function(
      error
    ) {
      console.error(chalk.red(error))
      reject(error)
    })

    ws.on('error', function(error) {
      console.error(chalk.red('Error in sendKey WebSocket communication'))
      reject(error)
    })

    let connectTimeout = setTimeout(() => {
      reject(new Error('Could not power on'))
    }, 5000)

    ws.on('message', function(data, flags) {
      // WebSocket connection successful, clear timeout which would otherise trigger WOL.
      clearTimeout(connectTimeout)
      // Parse message recieved from TV.
      data = JSON.parse(data)
      // Connection message recieved from TV.
      if (data.event === 'ms.channel.connect') {
        resolve(ws)
      }
    })
  })
}

const sendKey = async key => {
  // Create WebSocket object.
  try {
    if (!ws) ws = await openSocket()
  } catch (e) {
    // If WebSocket fails to connect before timeout, close WebSocket and power on over WOL.
    if (key === 'KEY_POWER') {
      try {
        console.info(chalk.green('Powered on using Wake On Lan (WOL)'))
        return powerOnOverLan()
      } catch (e) {
        console.error(chalk.red('Wake on Lan (WOL) failed'))
      }
    }

    return
  }

  return new Promise((resolve, reject) => {
    console.info(`${chalk.green('Received command:', key)}`)
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

    // Stringify message object and send over WebSocket.
    ws.send(JSON.stringify(cmd), () => {
      console.info(chalk.green(`Sent ${key} over websocket`))
      ws.close()
      ws = null
      setTimeout(resolve, 600)
    })
  })
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

const batchSend = async keys => {
  await asyncForEach(keys, async key => {
    await sendKey(key)
    console.log(key)
  })
  console.log('Done')
}

module.exports = {
  sendKey,
  batchSend
}

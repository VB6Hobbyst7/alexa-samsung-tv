const express = require('express')
const alexa = require('alexa-app')
const fs = require('fs')
const https = require('https')
const sendKey = require('./lib/sendKey')
const chalk = require('chalk')
const dotenv = require('dotenv')
dotenv.config()

// Skill name
const appName = 'tv-remote'

const PORT = process.env.PORT || 3000
const HOSTNAME = process.env.HOSTNAME
const KEY_PATH = process.env.KEY_PATH
const CERT_PATH = process.env.CERT_PATH

const app = express()

const httpsOptions = {
  key: fs.readFileSync(KEY_PATH),
  cert: fs.readFileSync(CERT_PATH)
}

// ALWAYS setup the alexa app and attach it to express before anything else.
const alexaApp = new alexa.app(appName)

alexaApp.express({
  expressApp: app,

  // verifies requests come from amazon alexa. Must be enabled for production.
  // You can disable this if you're running a dev environment and want to POST
  // things to test behavior. enabled by default.
  checkCert: false,

  // sets up a GET route when set to true. This is handy for testing in
  // development, but not recommended for production. disabled by default
  debug: true
})

// now POST calls to /tv-remote in express will be handled by the app.request() function

const remoteResponse = key => {
  console.info(`${chalk.green('Received command:', key)}`)
  sendKey(key, () => {})
}

alexaApp.launch(function(request, response) {
  response.say('You launched the app!')
})

alexaApp.intent(
  'AMAZON.HelpIntent',
  {
    slots: {},
    utterances: []
  },
  function(request, response) {
    var helpOutput =
      "You can say 'some statement' or ask 'some question'. You can also say stop or exit to quit."
    var reprompt = 'What would you like to do?'
    // AMAZON.HelpIntent must leave session open -> .shouldEndSession(false)
    response.say(helpOutput).reprompt(reprompt).shouldEndSession(false)
    return
  }
)

alexaApp.intent(
  'AMAZON.StopIntent',
  {
    slots: {},
    utterances: []
  },
  function(request, response) {
    var stopOutput = "Don't You Worry. I'll be back."
    response.say(stopOutput)
    return
  }
)

alexaApp.intent(
  'AMAZON.CancelIntent',
  {
    slots: {},
    utterances: []
  },
  function(request, response) {
    var cancelOutput = 'No problem. Request cancelled.'
    response.say(cancelOutput)
    return
  }
)

alexaApp.intent(
  'power',
  {
    utterances: ['power', 'turn on', 'turn off']
  },
  function(request, response) {
    response.say('Powering on')
    remoteResponse('KEY_POWER')
  }
)

alexaApp.intent(
  'mute',
  {
    utterances: ['mute']
  },
  function(request, response) {
    response.say('Muted')
    remoteResponse('KEY_MUTE')
  }
)

alexaApp.intent(
  'volumeUp',
  {
    utterances: ['turn the volume up', 'louder']
  },
  function(request, response) {
    response.say('Volume up')
    remoteResponse('KEY_VOLUP')
  }
)

alexaApp.intent(
  'volumeDown',
  {
    utterances: ['turn the volume down', 'quieter']
  },
  function(request, response) {
    response.say('Volume down')
    remoteResponse('KEY_VOLDOWN')
  }
)

// Generate and output app schema (intents and utterances) for skill interaction model
const intents = alexaApp.schema()
const utterances = alexaApp.utterances()
console.info(`
${chalk.blue.dim.bold('Your app intents:')}
${chalk.grey.dim(intents)}

${chalk.blue.dim.bold('Your app utterances:')}
${chalk.grey.dim(utterances)}
`)

// Output port and remote endpoint
const server = https.createServer(httpsOptions, app).listen(PORT, () => {
  console.info(`
${chalk.blue.dim.bold('Listening on port:', PORT)}
${chalk.blue.dim.bold(`${HOSTNAME}:${PORT}/${appName}`)}`)
})

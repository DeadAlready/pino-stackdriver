#!/usr/bin/env node

const program = require('commander')

const pkg = require('../package.json')
const stackdriver = require('././index')

function collect (value, previous) {
  return previous.concat([value])
}

// main cli logic
function main () {
  let dataFlow = false
  program
    .version(pkg.version)
    .option('-c, --credentials <credentials>', 'The file path of the JSON file that contains your service account key')
    .option('-p, --project <project>', 'Your Google Cloud Platform project ID')
    .option('-n, --name <logname>', 'Log Name in Stackdriver')
    .option('-k, --key <key:customKey>', 'Customize additional data to include in log metadata', collect, [])
    .action(({ credentials, project, key, logname }) => {
      try {
        const _credentials = credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS
        if (!process.env.PROJECT_ID && !project) { throw Error('Project is missing.') }
        const _project = project || process.env.PROJECT_ID
        const _name = logname || process.env.LOG_NAME

        const customKeys = {}
        key.forEach(k => {
          const pair = k.split(':')
          if (pair.length !== 2) { throw Error(`Invalid key:customKey pair ${k}`) }
          customKeys[pair[0]] = pair[1]
        })
        const writeStreamOptions = {
          credentials: _credentials,
          projectId: _project,
          keys: customKeys,
          logName: _name
        }

        const pipe = () => {
          const writeStream = stackdriver.createWriteStream(writeStreamOptions)
          process.stdin.pipe(writeStream)
          writeStream.on('data', () => {
            dataFlow = true
          })
          writeStream.on('error', (err) => {
            // the stream is destroyed
            console.error(err)
            // This check prevents infinite recurring loop when stream create fails
            if (dataFlow) {
              pipe()
            }
          })
          console.info('logging')
        }
        pipe()
      } catch (error) {
        console.log(error.message)
      }
    })

  program.parse(process.argv)
}

main()

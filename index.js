'use strict'

const app = require('app')
const temp = require('temp')
const os = require('os')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events').EventEmitter
const https = require('https')
const parseUrl = require('url').parse
const cp = require('child_process')

const updater = new EventEmitter()
let feedUrl, downloadPath, downloading, updateData, unpackDir

/**
 * @param {String} cmd
 * @param {Array} args
 * @param {Object} opts
 * @return {Promise}
 */
function execute(cmd, args, opts) {
  return new Promise(function(resolve, reject) {
    let child = cp.spawn(cmd, args, opts)
    let stderr = [], stdout = []
    child.stderr.on('data', function(data) {
      stderr.push(data)
    })
    child.stdout.on('data', function(data) {
      stdout.push(data)
    })
    child.on('exit', function(code) {
      if (code != 0) {
        reject('"' + cmd + '" returned ' + code +
               "\nstdout: " + Buffer.concat(stdout).toString('utf-8') + 
               "\nstderr: " + Buffer.concat(stderr).toString('utf-8')
              )
      } else {
        resolve()
      }
    })
  })
}

/**
 * @return {Promise}
 */
function mkTempDir() {
  return new Promise(function(resolve, reject) {
    temp.mkdir(null, function(e, path) {
      e ? reject(e) : resolve(path)
    })
  })
}

/**
 * @param {String} src
 * @param {String} dst
 */
function download(src, dst) {
  return new Promise(function(resolve, reject) {
    let file = fs.createWriteStream(dst)
    let request = https.get(src, function(response) {
      response.pipe(file)
      file.on('finish', function() {
        file.close(resolve)
      })
    })
    
    request.on('error', function(error) {
      fs.unlink(dst)
      reject(error)
    })
  })
}

/**
 * @return {Promise} a promise that returns directory
 */
function unpack() {
  return mkTempDir()
  .then(dir => {
    unpackDir = dir
    let script = path.join(__dirname, 'unzip.vbs')
    return execute('cscript', [/*'//B',*/ script, downloadPath, unpackDir]).then(() => dir)
  })
}

/**
 * @param {String} url
 * @return {Promise}
 */
function request(url) {
  return new Promise(function(resolve, reject) {
    let p = parseUrl(url)
    let module = ( p.protocol == 'https:' ? https : http )

    let req = module.request({
      method: 'GET',
      host: p.host,
      path: p.path
    })

    req.on('response', function(res) {
      let chunks = []
      res.on('data', function(chunk) {
        chunks.push(chunk)
      })
      res.on('end', function() {
        resolve({
          statusCode: res.statusCode,
          body: Buffer.concat(chunks).toString('utf-8')
        })
      })
    })
    req.end()
    req.on('error', function(error) {
      reject(error)
    })
  })
}

/**
 * @param {String} url
 */
updater.setFeedURL = function(url) {
  feedUrl = url
}

updater.checkForUpdates = function() {
  if (downloading) {
    console.log('[windows-updater] downloading in process, skip checking')
    return
  }
  if (!feedUrl) throw new Error('seedURL is not specified')

  request(feedUrl)
  .then(response => {
    if (response.statusCode != 200 && response.statusCode != 204) throw new Error('invalid status code: ' + response.statusCode)
    if (response.statusCode == 204) {
      this.emit('update-not-available')
      return
    }

    let data = JSON.parse(response.body)
    if (parseUrl(data.url).protocol != 'https:') throw new Error('update url must be https')

    updateData = data
    this.emit('update-available')

    return data
  })
  .then(() => {
    // Download
    downloadPath = temp.path({suffix: '.zip'})
    downloading = true
    return download(updateData.url, downloadPath)
  })
  .then(() => {
    console.log('[windows-updater] unpacking')
    return unpack()
  })
  .then((dir) => {
    console.log('[windows-updater] done')
    unpackDir = dir
    this.emit('update-downloaded', updateData)
  })
  .catch(e => {
    downloadPath = null
    updateData = null
    unpackDir = null
    downloading = false
    console.error('[windows-updater]', e)
    this.emit('error', e)
  })
}

updater.quitAndInstall = function() {
  let script = path.join(__dirname, 'run-elevated.vbs')
  let bat = path.join(__dirname, 'copy-elevated.bat')
  let exe = process.execPath
  let src = unpackDir
  let dst = path.dirname(process.execPath)
  
  let args = [script, bat, exe, src, dst]

  cp.spawn('cscript', args, {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore']
  }).unref()

  app.quit()
}

module.exports = updater

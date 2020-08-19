const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const fileupload = require('express-fileupload')
const cors = require('cors')
const sharp = require('sharp')

const conversion = require('./conversion.js')
const util = require('./util.js')
const config = require('./config.js')
const middleware = require('./middleware.js')
const relmRouter = require('./relm_router.js')
const { Relm, Permission } = require('./db/models.js')

const { wrapAsync, getRemoteIP } = util

const app = express()

// Automatically parse JSON body when received in REST requests
app.use(bodyParser.json())

// Enable CORS pre-flight requests across the board
// See https://expressjs.com/en/resources/middleware/cors.html#enabling-cors-pre-flight
app.options('*', cors())

// Courtesy page just to say we're a Relm web server
app.get('/', function (_req, res) {
  res.sendFile(__dirname + '/index.html')
})

app.post(
  '/authenticate',
  cors(),
  middleware.authenticated(),
  middleware.acceptToken(),
  wrapAsync(async (req, res) => {
    util.respond(res, 200, {
      status: 'success',
      action: 'authenticate',
    })
  })
)

app.post(
  '/mkadmin',
  cors(),
  middleware.authenticated(),
  middleware.authorized('admin'),
  wrapAsync(async (req, res) => {
    const permits = await Permission.getPermissions({
      playerId: req.body.playerId,
    })
    if (!permits.has('admin')) {
      await Permission.setPermissions({
        playerId: req.body.playerId,
        permits: ['admin'],
      })
      permits.add('admin')
    }
    util.respond(res, 200, {
      status: 'success',
      action: 'mkadmin',
      permits: [...permits],
    })
  })
)

app.get(
  '/relms/all',
  cors(),
  middleware.authenticated(),
  middleware.authorized('admin'),
  wrapAsync(async (req, res) => {
    const relms = await Relm.getAllRelms({})
    util.respond(res, 200, {
      status: 'success',
      relms,
    })
  })
)

app.get(
  '/relms/public',
  cors(),
  wrapAsync(async (req, res) => {
    const relms = await Relm.getAllRelms({ isPublic: true })
    util.respond(res, 200, {
      status: 'success',
      relms,
    })
  })
)

app.use('/relm/:relmName', middleware.relmName(), relmRouter)

// Serve uploaded files
app.use(
  '/asset',
  express.static(config.ASSET_DIR, {
    setHeaders: (res, path, stat) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET')
      res.header('Access-Control-Allow-Headers', 'Content-Type')
    },
  })
)

// Allow files to be uploaded.
// NOTE: This must be before app.post('/asset')
app.use(
  fileupload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, 'tmp'),
  })
)

// Upload images and 3D assets
app.post(
  '/asset',
  cors(),
  wrapAsync(async (req, res) => {
    const asset = req.files.file
    if (asset.size > config.MAX_FILE_SIZE) {
      return util.fail(res, 'file too large')
    }

    const extension = path.extname(asset.name)
    if (extension.length > config.MAX_FILE_EXTENSION_LENGTH) {
      return util.fail(res, 'file extension too long')
    }

    try {
      switch (extension) {
        case '.jpg':
        case '.jpeg':
        case '.gif':
        case '.png':
        case '.webp':
          const pngTempFile = asset.tempFilePath + '.png'
          await sharp(asset.tempFilePath).toFile(asset.tempFilePath + '.png')
          const pngFile = await conversion.moveAndRenameContentAddressable(
            pngTempFile
          )

          const webpTempFile = asset.tempFilePath + '.webp'
          await sharp(asset.tempFilePath).toFile(asset.tempFilePath + '.webp')
          const webpFile = await conversion.moveAndRenameContentAddressable(
            webpTempFile
          )

          return conversion.fileUploadSuccess(res, {
            png: pngFile,
            webp: webpFile,
          })

        case '.glb':
        case '.packed-glb':
        case '.gltf':
        case '.packed-gltf':
          return conversion.fileUploadSuccess(res, {
            gltf: await conversion.moveAndRenameContentAddressable(
              asset.tempFilePath,
              extension
            ),
          })

        default:
          const file = await conversion.moveAndRenameContentAddressable(
            asset.tempFilePath,
            extension
          )
          return conversion.fileUploadSuccess(res, {
            '*': file,
          })
      }
    } catch (err) {
      return util.fail(res, err)
    }
  })
)

// Error handling: catch-all for 404s
app.use((req, res) => {
  const code = 404
  util.respond(res, code, {
    status: 'error',
    code: code,
    reason: `Not found`,
  })
})

// Error handling: general catch-all for errors must be last middleware
// see http://expressjs.com/en/guide/error-handling.html
// see https://thecodebarbarian.com/80-20-guide-to-express-error-handling
app.use((error, req, res, next) => {
  const errorId = util.uuidv4().split('-')[0]
  const code = error.status || 400
  console.log(
    `[${getRemoteIP(req)}] ${code} (${errorId}): ${error.message}\n${
      error.stack
    }`
  )
  util.respond(res, code, {
    status: 'error',
    code: code,
    reason: `${error.message} (${errorId})`,
  })
})

module.exports = app

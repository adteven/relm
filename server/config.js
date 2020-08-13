const SECURITY_CONFIG = {
  name: 'ECDSA',
  namedCurve: 'P-384',
  namedHash: 'SHA-384',
}

const MAX_TOKEN_LENGTH = 100
const MAX_UUID_LENGTH = 36
const MAX_FILE_SIZE = 2097152 * 2
const MAX_FILE_EXTENSION_LENGTH = 30 // e.g. '.jpeg', '.gltf', '.packed-gltf'
const SETUP_TOKEN = 'setup'
const SETUP_TOKEN_COUNTER = 1
const CONTENT_TYPE_JSON = { 'Content-Type': 'application/json' }
const ASSET_DIR = __dirname + '/assets'
const PASSWORD_LENGTH_MINIMUM = 6
const PORT = process.env.PORT || 3000

const DATABASE_URL = process.env.DATABASE_URL
// --- OR ---
const DATABASE_NAME = process.env.DATABASE_NAME || 'relm'
const DATABASE_HOST = process.env.DATABASE_HOST || '/var/run/postgresql'
// NOTE: Password should not be set if using postgres peer authentication
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD

module.exports = {
  SECURITY_CONFIG,
  MAX_TOKEN_LENGTH,
  MAX_UUID_LENGTH,
  MAX_FILE_SIZE,
  MAX_FILE_EXTENSION_LENGTH,
  SETUP_TOKEN,
  SETUP_TOKEN_COUNTER,
  CONTENT_TYPE_JSON,
  ASSET_DIR,
  PASSWORD_LENGTH_MINIMUM,
  PORT,

  DATABASE_NAME,
  DATABASE_HOST,
  DATABASE_PASSWORD,
}

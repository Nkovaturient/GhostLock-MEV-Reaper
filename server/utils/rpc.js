const { ethers } = require('ethers')
const { CONFIG } = require('../config.js')

let publicProvider = null
let logsProvider = null

function getPublicProvider() {
  if (!publicProvider) {
    publicProvider = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL)
  }
  return publicProvider
}

function getLogsProvider() {
  if (!logsProvider) {
    logsProvider = new ethers.JsonRpcProvider(CONFIG.NETWORK.LOG_RPC_URL)
  }
  return logsProvider
}

module.exports = { getPublicProvider, getLogsProvider }

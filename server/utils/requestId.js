const { ethers } = require('ethers')
const fs = require('fs')

/** GhostLock tlock request IDs are uint256. Never use JavaScript Number. */
function requestIdToString(id) {
  if (id == null) return null
  if (typeof id === 'bigint') return id.toString()
  if (typeof id === 'string') return id
  try {
    return ethers.toBigInt(id).toString()
  } catch {
    return null
  }
}

function requestIdFromEventArg(arg) {
  if (arg == null) return null
  try {
    return ethers.toBigInt(arg).toString()
  } catch {
    return null
  }
}

const DEBUG_LOG_PATH = '/Users/matrix/Documents/Season1/.cursor/debug-6912e8.log'

function agentDebugLog(location, message, data, hypothesisId, runId = 'pre-fix') {
  // #region agent log
  try {
    fs.appendFileSync(
      DEBUG_LOG_PATH,
      `${JSON.stringify({
        sessionId: '6912e8',
        location,
        message,
        data,
        hypothesisId,
        runId,
        timestamp: Date.now(),
      })}\n`,
    )
  } catch {
    /* ignore */
  }
  // #endregion
}

module.exports = { requestIdToString, requestIdFromEventArg, agentDebugLog }

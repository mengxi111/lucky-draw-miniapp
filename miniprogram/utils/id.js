let sequence = 0

function createId(prefix) {
  sequence = (sequence + 1) % 46656
  return `${prefix}_${Date.now().toString(36)}_${sequence.toString(36)}`
}

module.exports = { createId }

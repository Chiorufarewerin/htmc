class AssertionError extends Error {
  name = "AssertionError";
}

/**
 * @param {unknown} condition
 * @param {string | undefined} message
 * @returns {asserts condition}
 */
function assert(condition, message = undefined) {
  if (!condition) {
    throw new AssertionError(message);
  }
}

module.exports = assert;

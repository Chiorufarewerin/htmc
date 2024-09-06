class AssertionError extends Error {
  name = "AssertionError";
}

/**
 * @param {unknown} condition
 * @returns {asserts condition}
 */
function assert(condition) {
  if (!condition) {
    throw new AssertionError();
  }
}

module.exports = assert;

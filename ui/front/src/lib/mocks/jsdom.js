// Mock module for jsdom in server-side rendering
// This prevents jsdom from being loaded on the server, which causes errors
// when trying to read CSS files that don't exist in the server environment

module.exports = {}


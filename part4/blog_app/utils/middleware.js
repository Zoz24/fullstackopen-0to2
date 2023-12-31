const logger = require('./logger')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method)
  logger.info('Path:  ', request.path)
  logger.info('Body:  ', request.body)
  logger.info('---')
  next()
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  logger.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({ error: error.message })
  } else if (error.name === 'TokenExpiredError') {
    return response.status(401).json({
      error: 'token expired',
    })
  }

  next(error)
}

const tokenExtractor = (request, response, next) => {
  // Extract the token from the authorization header and add it to the request object
  const authorization = request.get('authorization')
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    request.token = authorization.substring(7)
  } else {
    if (request.method !== 'GET') {
      console.log('Extracted Token:', request.token) // For debugging purposes
      return response.status(401).json({ error: 'token missing or invalid' })
    }
  }
  next()
}

const userExtractor = async (request, response, next) => {
  // Skip JWT verification for GET requests
  if (request.method !== 'GET') {
    // Extract the user from the request token and add it to the request object
    try {
      const decodedToken = jwt.verify(request.token, process.env.SECRET)
      if (!decodedToken.id) {
        return response.status(401).json({ error: 'token invalid' })
      }
      request.user = await User.findById(decodedToken.id)
    } catch (error) {
      return response.status(401).json({ error: error.message })
    }
  }
  next()
}

module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenExtractor,
  userExtractor,
}

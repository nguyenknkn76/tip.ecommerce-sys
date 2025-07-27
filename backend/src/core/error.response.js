'use strict'

const { ReasonPhrases, StatusCodes } = require("../utils/httpStatusCode");

const StatusCode = {
  FORBIDDEN: 403,
  CONFLICT: 409,
};
const ReasonStatusCode = {
  FORBIDDEN: 'Bad request error',
  CONFLICT: 'Conflict error',
};


class ErrorResponse extends TypeError {

  constructor(message, status){
    super(message)
    this.status = status;
  }
}

class ConcfictRequestError extends ErrorResponse {

  constructor(message = ReasonStatusCode.CONFLICT, statusCode = StatusCode.CONFLICT){
    super(message, statusCode);
  }
}

class BadRequestError extends ErrorResponse {

  constructor(message = ReasonStatusCode.FORBIDDEN, statusCode = StatusCode.FORBIDDEN){
    super(message, statusCode);
  }
}

class AuthFailureError extends ErrorResponse {

  constructor(message = ReasonPhrases.UNAUTHORIZED, statusCode = StatusCodes.UNAUTHORIZED){
    super(message, statusCode);
  }
}

class NotFoundError extends ErrorResponse {

  constructor(message = ReasonPhrases.NOT_FOUND, statusCode = StatusCodes.NOT_FOUND){
    super(message, statusCode);
  }
}


module.exports = {
  ConcfictRequestError,
  BadRequestError,
  AuthFailureError,
  NotFoundError
}
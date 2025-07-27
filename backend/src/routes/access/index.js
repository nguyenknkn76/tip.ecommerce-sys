'use strict'

const express = require('express');
const accessController = require('../../controllers/access.controller');
const { authentication } = require('../../auth/authUtils');
const { asyncHandler } = require('../../helpers/asyncHandler');
const router = express.Router();

// sign-up
router.post('/shop/signup', asyncHandler(accessController.signUp));
router.post('/shop/login', asyncHandler(accessController.login));

// authentication
router.use(authentication);
// 
router.post('/shop/logout', asyncHandler(accessController.logout));
module.exports = router;
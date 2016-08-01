var express = require('express');
var router = express.Router();

var jwt = require('express-jwt');
var auth = jwt({
    secret: process.env.JWT_SECRET,
    userProperty: 'payload'
});

var ctrlFilter = require('../controllers/filter');

// Cleaning
router.post('/filters/execute', ctrlFilter.filtersExecute);

module.exports = router;

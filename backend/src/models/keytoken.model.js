'use strict'

const mongoose = require('mongoose'); // Erase if already required

const DOCUMENT_NAME = 'Key';
const COLLECTION_NAME = 'Keys'

// Declare the Schema of the Mongo model
var keyTokenSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref: 'Shop'
    },
    publicKey:{
        type:String,
        required:true,
    },
    // use to detect hacker used this token illegally
    refreshtoken:{
        type:Array,
        default: []
    },
},{
  collection: COLLECTION_NAME,
  timestamps: true,
});

//Export the model
module.exports = mongoose.model(DOCUMENT_NAME, keyTokenSchema);
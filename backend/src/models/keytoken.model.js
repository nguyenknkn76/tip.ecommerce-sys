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
    privateKey:{
        type:String,
        required:true,
    },
    publicKey:{
        type:String,
        required:true,
    },
    // use to detect hacker used this token illegally
    refreshTokensUsed:{
        type:Array,
        default: [] // rf tokens be used
    },
    refreshToken: {
        type: String,
        required: true,
    }
},{
  collection: COLLECTION_NAME,
  timestamps: true,
});

//Export the model
module.exports = mongoose.model(DOCUMENT_NAME, keyTokenSchema);
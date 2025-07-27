# SETUP

## Install Libs

- `npm init`
- libs:
- nodemon
- express
- morgan
- helmet
- compression

## Connect Database MongoDB

### SETUP Mongodb Compass

- create connection
- create database
- init collections

### Problems

- mongoose
- connection
  - count connect
  - check overload connect
- disConnect
  - should we using disConnect() mongoC? don't need
  - some keyword: pool
- PoolSize
  - pool: mongo, mysql → read more about: pool advantages
  - over poolsize → queue

### Config `.env` and `configs`

#### intro & advantages

1. local
2. cloud
3. team

## Functions

- sign-up shop: model-router-controller-service
- about `lean`: `const hodelShop = await shopModel.findOne({email}).lean();`
- package: bcrypt, crypto, jsonwebtoken, lodash

## middleware for apiKey and permissions


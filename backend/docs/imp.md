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

```.env
# PORT=3000
#! some configs here
# ===== DEVELOPMENT =====
DEV_APP_PORT=3000
DEV_DB_HOST=localhost
DEV_DB_PORT=27017
DEV_DB_NAME=shopDEV

# ===== PRODUCTION =====
PRO_APP_PORT=3001
PRO_DB_HOST=localhost
PRO_DB_PORT=27017
PRO_DB_NAME=shopPRO
```
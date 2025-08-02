# HOW TO DO IT?

## SETUP

## ACCOUNT

### SIGNUP

- Using RSA
- Common flows:

### AUTHENTICATION

### LOGIN

### LOGOUT

### Handle illegal refresh TOKEN

Trien khai he thong tu dong phat hien token da duoc su dung boi hacker va cach xu ly

## PRODUCT

### GENERAL

- Polymorphic pattern
- Mongo
()

### CREATE PRODUCT

### SOME FUNCTION

- package: slugify
- full text search, elastich search

### Importnant Vid

- 12


## Directory Structure

- auth
- config
- controllers
- core
- dbs
- helpers
- models
- postman
- routes
  - access
  - product
  - shop
- services
- utils: 
- app.js: init middleware, init database, init routes, handle error
- server.js

- compare get, delete, put, patch, post
- PUT: create new obj, updateOne
- POST: 
- PATCH: updateOne
~ bandwidth: for server


###

- inventories: stock, product quantity
- discount:
  - type of discount
    - shop create discount 
    - admin create discount
  - service:
    - gen discount code: shop | admin
    - get discount codes: user, shop,
    - get all product by discount code: user
    - get discount amount: user
    - del discount code: admin, shop
    - cancel discount code: user
  
- cart
  - services
    - add product to cart: user
    - reduce product quantity: user
    - increase product quantity: user
    - get list to cart: user
    - delete cart: user
    - delete cart item: user

- orders:
  - ...: 
    - positive key, negative key, distributed key
    - pessimistic locking, optimistic locking
  - services:
    - 
-  payments


> note: handle service → using builder pattern
> something about func of node version 20
> stream nodejs
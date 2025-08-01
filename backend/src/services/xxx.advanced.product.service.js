'use strict'

const { BadRequestError } = require('../core/error.response');
const {clothing, electronic, product, furniture} = require('../models/product.model');
const { insertInventory } = require('../models/repositories/inventory.repo');
const { 
  findAllDrafsForShop, 
  publishProductByShop,
  findAllPublishForShop,
  unPublishProductByShop,
  searchProductsByUser,
  findAllProducts,
  findProduct,
  updateProductById
} = require('../models/repositories/product.repo');
const { removeUndefinedObject, updateNestedObjectParser } = require('../utils');

// Factory Class
class ProductFactory {
  static productRegistry = {}; //key-class
  static registerProductType(type, classRef){
    ProductFactory.productRegistry[type] = classRef;
  }

  static async createProduct(type, payload){
    const productClass = ProductFactory.productRegistry[type];
    if(!productClass) throw new BadRequestError(`Invalid product type ${type}`);
    return new productClass(payload).createProduct();
  }

  static async updateProduct(type, productId, payload){
    const productClass = ProductFactory.productRegistry[type];
    if(!productClass) throw new BadRequestError(`Invalid product type ${type}`);
    return new productClass(payload).updateProduct(productId);
  }

  // ! PUT

  static async publishProductByShop ({product_shop, product_id}) {
    return await publishProductByShop({product_shop, product_id});
  }

  static async unPublishProductByShop ({product_shop, product_id}) {
    return await unPublishProductByShop({product_shop, product_id});
  }

  // ! END PUT

  // ! QUERY

  static async findAllDrafsForShop({product_shop, limit = 50, skip = 0}){
    const query = { product_shop, isDraf: true};
    return await findAllDrafsForShop({query, limit, skip})
  }

  static async findAllPublishForShop({product_shop, limit = 50, skip = 0}){
    const query = { product_shop, isPublished: true};
    return await findAllPublishForShop({query, limit, skip})
  }

  static async findAllProducts({limit = 50, sort = 'ctime', page = 1, filter = {isPublished: true}}){
    return await findAllProducts({limit, sort, filter, page, 
      select:['product_name', 'product_price', 'product_thumb', 'product_shop'],
    });
  }

    static async findProduct({product_id}){
    return await findProduct({product_id, 
      unSelect: ['__v']
    });
  }

  static async searchProducts ({keySearch}) {
    return await searchProductsByUser({keySearch});
  }
}

// base product Class
class  Product {
  constructor({
    product_name, product_thumb, product_description, product_price,
    product_quantity, product_type, product_shop, product_attributes
  }){
    this.product_name = product_name;
    this.product_thumb = product_thumb;
    this.product_description = product_description;
    this.product_price = product_price;
    this.product_quantity = product_quantity;
    this.product_type = product_type;
    this.product_shop = product_shop;
    this.product_attributes = product_attributes;
  }
  // create new product
  async createProduct(product_id){
    const newProduct =  await product.create({...this, _id: product_id}); 
    if(newProduct){
      // add product_stock in inven collection
      await insertInventory({
        productId: newProduct._id,
        shopId: this.product_shop,
        stock: this.product_quantity
      })
    }
    return newProduct;
  }

  // update product
  async updateProduct(productId, bodyUpdate){
    return await updateProductById({productId, bodyUpdate, model: product});
  }
}

// Define sub-class for diff product types Clothing
class Clothing extends Product{
  async createProduct(){
    const newClothing = clothing.create({
      ...this.product_attributes,
      product_shop: this.product_shop
    });
    if(!newClothing) throw new BadRequestError('create new clothing error');
    
    const newProduct = await super.createProduct((await newClothing)._id);
    if(!newProduct) throw new BadRequestError('create new product error');

    return newProduct;
  }

  async updateProduct( productId ){
    const objectParams = this;
    if(objectParams.product_attributes){
      // update child
      await updateProductById({productId, objectParams, model: clothing});
    }
    const updateProduct = await super.updateProduct(productId, objectParams);
    return updateProduct;
  }
}

// Define sub-class for diff product types Electronics
class Electronics extends Product{
  async createProduct(){
    const newElectronic = electronic.create({
      ...this.product_attributes,
      product_shop: this.product_shop
    });
    if(!newElectronic) throw new BadRequestError('create new electronic error');

    const newProduct = await super.createProduct((await newElectronic)._id);
    if(!newProduct) throw new BadRequestError('create new product error');

    return newProduct;
  }

  async updateProduct( productId ){
    const objectParams = removeUndefinedObject(this);
    if(objectParams.product_attributes){
      await updateProductById({
        productId, 
        bodyUpdate: updateNestedObjectParser(objectParams.product_attributes), 
        model: electronic
      });
    }
    const updateProduct = await super.updateProduct(
      productId, 
      updateNestedObjectParser(objectParams),
    );
    return updateProduct;
  }
}

// Define sub-class for diff product types Furniture
class Furnitures extends Product{
  async createProduct(){
    const newFurniture = furniture.create({
      ...this.product_attributes,
      product_shop: this.product_shop
    });
    if(!newFurniture) throw new BadRequestError('create new furniture error');

    const newProduct = await super.createProduct((await newFurniture)._id);
    if(!newProduct) throw new BadRequestError('create new product error');

    return newProduct;
  }
}

// register product_types
ProductFactory.registerProductType('Electronics', Electronics);
ProductFactory.registerProductType('Clothing', Clothing);
ProductFactory.registerProductType('Furniture', Furnitures );

module.exports = ProductFactory;
'use strict'

const { Types } = require("mongoose")
const { product } = require("../product.model");
const { getSelectData, unGetSelectData, convertToObjectIdMongodb, logValue } = require("../../utils");

const findAllDrafsForShop = async ({query, limit, skip}) => {
  return await queryProduct({query, limit, skip});
}

const findAllPublishForShop = async ({query, limit, skip}) => {
  return await queryProduct({query, limit, skip});
}

const searchProductsByUser = async ({keySearch}) => {
  const regexSearch = new RegExp(keySearch);
  const results = await product.find({
    isDraf: false,
    $text: {$search: regexSearch},
  },{score: {$meta: 'textScore'}})
  .sort({score: {$meta: 'textScore'}})
  .lean();
  return results;
}

const publishProductByShop = async ({product_shop, product_id}) => {
  const foundShop = await product.findOne({
    product_shop: new Types.ObjectId(product_shop),
    _id: new Types.ObjectId(product_id),
  });
  if(!foundShop) return null;

  foundShop.isDraf = false;
  foundShop.isPublished = true;

  // mongo return 0 OR 1(~ update success)
  const {modifiedCount} = await foundShop.updateOne(foundShop);

  return modifiedCount;
}

const unPublishProductByShop = async({product_shop, product_id}) => {
    const foundShop = await product.findOne({
    product_shop: new Types.ObjectId(product_shop),
    _id: new Types.ObjectId(product_id),
  });
  if(!foundShop) return null;
  foundShop.isDraf = true;
  foundShop.isPublished = false;

  const {modifiedCount} = await foundShop.updateOne(foundShop);
  return modifiedCount;
}

const findAllProducts = async ({limit, sort, page, filter, select}) => {
  const skip = (page - 1) * limit;
  const sortBy = sort === 'ctime' ? {_id: -1} : {_id: 1};
  const products = await product.find( filter )
    .sort(sortBy)
    .skip(skip)
    .limit(limit)
    .select(getSelectData(select))
    .lean()
  return products;
}

const findProduct = async ({product_id, unSelect}) => {
  return await product.findById(product_id)
    .select(unGetSelectData(unSelect));
}

const updateProductById = async({
  productId,
  bodyUpdate,
  model, 
  isNew = true 
}) => {
  return await model.findByIdAndUpdate(productId, bodyUpdate, {
    new: isNew,
  });
} 

const queryProduct = async ({query, limit, skip}) => {
  return await product.find(query)
  .populate('product_shop', 'name email -_id')
  .sort({updateAt: -1})
  .skip(skip)
  .limit(limit)
  .lean()
  .exec()
}

const getProductById = async productId => {
  return await product.findOne({_id: convertToObjectIdMongodb(productId)}).lean();
}

const checkProductByServer = async products => {
  return await Promise.all(products.map(async product => {
    const foundProduct = await getProductById(product.product_id);
    if(foundProduct) {
      return {
        price: foundProduct.product_price,
        quantity: product.quantity,
        productId: product.product_id,
      }
    }
    return null; //todo this sus
  }));
}

module.exports = {
  findAllDrafsForShop,
  publishProductByShop,
  findAllPublishForShop,
  unPublishProductByShop,
  searchProductsByUser,
  findAllProducts,
  findProduct,
  updateProductById,
  getProductById,
  checkProductByServer
}
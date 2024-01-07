
const db = require('../config/connection'); // Import the MongoDB client instance (adjust the path accordingly)
const { PRODUCT_COLLECTION } = require('../config/collections');
const collections = require('../config/collections');
const { logger } = require('handlebars');
const { ObjectId } = require('mongodb');




module.exports = {
  addProduct: async (product,callback) => {
    try {
      const database = db.getDatabase();
      if (!database) return false;

      const result =  await database.collection('product').insertOne(product);
      console.log('Product added successfully:');
       console.log(result);
      const objectId = new ObjectId(result.insertedId);
      console.log(objectId.toString()+'in kelper');
      callback (objectId.toString())
    } catch (error) {
      console.error('Error adding product:', error);
      callback(error);
    }
  },
  getAllProducts:()=>{
    return new Promise(async(resolve,reject)=>{
        let products= await db.getDatabase().collection(PRODUCT_COLLECTION).find().toArray()
        const productsWithStrings = products.map(product => ({
            ...product,
            _id: product._id.toString()
          }));
        resolve(productsWithStrings)
    })
  },
  deleteProduct:(proId)=>{
    return new Promise(async(resolve,reject)=>{
        const objectId = new ObjectId(proId);
        let deletedProduct= await db.getDatabase().collection(PRODUCT_COLLECTION).deleteOne({_id:objectId}).then((response)=>{
            console.log(response);
            resolve(response)
        })

    })
  },findProduct:(proId)=>{
      return new Promise(async(resolve, reject) => {
        const objectId = new ObjectId(proId);
        let product=await db.getDatabase().collection(PRODUCT_COLLECTION).findOne({_id:objectId})
        resolve(product)
      })
  },editProduct:(proId,proDetails)=>{
   return new Promise(async(resolve, reject) => {
    const objectId = new ObjectId(proId);
    let product=await db.getDatabase().collection(PRODUCT_COLLECTION).findOneAndUpdate(
        { _id: objectId },
        { $set:proDetails },
        { new: true }, )
        resolve(product)
   })

  },
  getOrdersAdmin:()=>{
    return new Promise(async (resolve, reject) => {
        let eachOrder=await db.getDatabase().collection(collections.ORDER_COLLECTION).find({}).toArray();

        resolve(eachOrder)
        }
)},
getOrderProducts:(orderId)=>{
return new Promise(async (resolve, reject) => {
  let orderItems = await db.getDatabase()
  .collection(collections.ORDER_COLLECTION)
  .aggregate([
    { $match: { _id: new ObjectId(orderId) } },
    { $unwind: '$products.products' }, // Unwind the nested array
    {
      $lookup: {
        from: collections.PRODUCT_COLLECTION,
        localField: 'products.products.item',
        foreignField: '_id',
        as: 'product',
      },
    },
    {
      $project: {
        item: '$products.products.item',
        quantity: '$products.products.quantity',
        product: { $arrayElemAt: ['$product', 0] },
      },
    },
  ])
  .toArray();

  resolve(orderItems)
}
  )},
  admnLogin:(AdminDetails)=>{
      return new Promise((resolve, reject) => {
        let loginStatus=false
        let adminData={
          username:'admin',
          password:'admin123'
         }
         if(adminData.username==AdminDetails.username && adminData.password==AdminDetails.password){
          loginStatus=true
         }
         resolve(loginStatus)
      })
  },
getCategoryProducts:(category)=>{

  return new Promise(async (resolve, reject) => {
   let products= await db.getDatabase().collection(PRODUCT_COLLECTION).find({ deviceCategory: category,}).toArray()
   const productsWithStrIds = products.map(product => ({
    ...product,
    _id: product._id.toString(),
  }));
   resolve(productsWithStrIds)
   
  })
},
}


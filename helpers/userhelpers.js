const { ObjectId } = require('mongodb');
const { response } = require('../app');
const { PRODUCT_COLLECTION, USER_COLLECTION, CART_COLLECTION } = require('../config/collections');
const db = require('../config/connection'); // Import the MongoDB client instance (adjust the path accordingly)
const bcrypt = require('bcrypt');
const collections = require('../config/collections');
const Razorpay = require('razorpay');
const saltRounds = 10;

module.exports={
    getUserprod:()=>{
        return new Promise(async(resolve,reject)=>{
            let products= await db.getDatabase().collection(PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    doSignup:(user)=>{
     return new Promise((resolve,reject)=>{
        bcrypt.genSalt(saltRounds, async function(err, salt) {
             bcrypt.hash(user.password, salt,  function(err, hash) {
                if (err) {
                    console.error('Error hashing password:', err);
                    return;
                  }
                  user.password =  hash;
                  db.getDatabase().collection(USER_COLLECTION).insertOne(user);
                  resolve(user)
            });
        });
     })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let response={}
                let loginStatus = false;
                let status=false
                let user = await db.getDatabase().collection(USER_COLLECTION).findOne({ email: userData.email });
    
                if (user) {
                    const passwordMatch = await bcrypt.compare(userData.password, user.password);
    
                    if (passwordMatch) {
                        console.log('Login successful');
                        response.user=user
                        response.status=true
                        resolve(response);
                    } else {
                        console.log('Login failed: Incorrect password');
                        response.status=true
                        resolve(status=false);
                    }
                } else {
                    console.log('Login failed: User not found');

                    resolve(status=true);
                }
            } catch (error) {
                console.error('Error during login:', error);
                reject(error);
            }
        });
    },
    addToCart:(proId,userId)=>{
        let proObj={
            item:new ObjectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.getDatabase().collection(CART_COLLECTION).findOne( {user:new ObjectId(userId)})
            if(userCart){
                let proExist=userCart.products.findIndex(product=>product.item==proId)
                
                if (proExist !== -1) {
                    db.getDatabase().collection(CART_COLLECTION).updateOne(
                      { user: new ObjectId(userId), 'products.item': new ObjectId(proId) },
                      {
                        $inc: { 'products.$.quantity': 1 }
                      }
                    ).then(() => {
                      resolve();
                    }).catch((error) => {
                      console.error(error);
                      reject(error); // Add error handling
                    });
                  
                  
                    
                
               }else{
                await db.getDatabase().collection(CART_COLLECTION).updateOne(
                    { user:new ObjectId(userId) },
                    { $push: { products:proObj } },).then((response)=>{
                        resolve()
                    })
                }
            }else{
                let cartobj={
                    user: new ObjectId(userId),
                    products:[proObj]
                }
                db.getDatabase().collection(CART_COLLECTION).insertOne(cartobj).then((response)=>{
                    resolve()
                })
            }
        })
    },getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
       let cartItems =await db.getDatabase().collection(CART_COLLECTION).aggregate([
        {
          $match: { user:new ObjectId(userId) } // Match the cart document by _id
        },
        {
            $unwind:'$products'
        },
        {
            $project:{
                item:'$products.item',
                quantity:'$products.quantity'
            }
        },{
            $lookup:{
                from:collections.PRODUCT_COLLECTION,
                localField:'item',
                foreignField:'_id',
                as:'product'
            }
        },
        {
            $project:{
                item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
            }
        }
      ]).toArray()
      resolve(cartItems)
    }
)},
getCartCount:(useId)=>{
    return new Promise(async(resolve,reject)=>{
        let count=0
        let cart=await db.getDatabase().collection(CART_COLLECTION).findOne({user: new ObjectId(useId)})
        if(cart){
           count=cart.products.length
        }
        resolve(count)
    })
},
deleteCartProduct:(proId,userId)=>{

  return new Promise((resolve,reject)=>{
    db.getDatabase().collection(CART_COLLECTION).updateOne(    { 'user':new ObjectId(userId) },
    { $pull: { 'products': { 'item':new ObjectId(proId) } } })
       resolve({removeProduct:true})

  })
},updateItemQuantity:(proId,operation,userId,quantity)=>{
    return new Promise(async (resolve,reject)=>{
    operation=parseInt(operation)
   
  if(quantity==1 && operation==-1){
    db.getDatabase().collection(CART_COLLECTION).updateOne({user:new ObjectId(userId)},
    {
        $pull:{products:{item:new ObjectId(proId)}}
    }).then((response)=>{
        console.log(response);
        resolve(({removeProduct:true}))
    })

  }
    else{
     db
    .getDatabase()
    .collection(CART_COLLECTION)
    .updateOne(
      {
        user: new ObjectId(userId),
        'products.item': new ObjectId(proId),
      },
      {
        $inc: { 'products.$.quantity': operation}, // Use the sign of 'operation' to handle increment/decrement
      }
    )
    .then((response) => {
      resolve({status:true});
    });
   
  
}})},
getTotalAmount: (userId)=>{
    return new Promise(async (resolve,reject)=>{

    
    let cartItems =await db.getDatabase().collection(CART_COLLECTION).aggregate([
        {
          $match: { user:new ObjectId(userId) } // Match the cart document by _id
        },
        {
            $unwind:'$products'
        },
        {
            $project:{
                item:'$products.item',
                quantity:'$products.quantity'
            }
        },{
            $lookup:{
                from:collections.PRODUCT_COLLECTION,
                localField:'item',
                foreignField:'_id',
                as:'product'
            }
        },
        {
            $project:{
                item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
            }
        },{
            $group:{
                _id:null,
                total:{
                    $sum:{$multiply:['$quantity','$product.devicePrice']}
                }
            }
        }
      ]).toArray()
      resolve(cartItems)
})},
placeOrder:(order,products,total,userId)=>{
return new Promise((resolve,reject)=>{
    let orderStatus=order['payment-method']==='cod'?'placed':'pending'
    console.log(orderStatus);
    let ordeObj={
        deliveryDetails:{
            name:order.name,
            mobile:order.mobile,
            address:order.address,
            pin:order.pin
        },
        userId:new ObjectId(userId),
        payment:order['payment-method'],
        products:products,
        totalAmount:total,
        status:orderStatus,
        date:new Date()
    }
    db.getDatabase().collection(collections.ORDER_COLLECTION).insertOne(ordeObj).then((response)=>{
        db.getDatabase().collection(CART_COLLECTION).deleteOne({user:new ObjectId(userId)})
        const id = response.insertedId.toString();
        resolve(id)
    })
})
},
getCartProductList:(userId)=>{
   return new Promise(async (resolve,reject)=>{

    let products=await db.getDatabase().collection(CART_COLLECTION).findOne({user:new ObjectId(userId)})
    resolve(products)
   })
},
getOrders:(userId)=>{
    return new Promise(async (resolve, reject) => {
        let eachOrder=await db.getDatabase().collection(collections.ORDER_COLLECTION).find({ userId: new ObjectId(userId) }).toArray();
        resolve(eachOrder)
        }
)},
deleteOrder:(orderId)=>{
    return new Promise(async (resolve, reject) => {
        await db.getDatabase().collection(collections.ORDER_COLLECTION).deleteOne({_id:new ObjectId(orderId)})
        resolve()
    })
},
getAllUsers:()=>{
    return new Promise(async (resolve, reject) => {
        let eachUser=await db.getDatabase().collection(collections.USER_COLLECTION).find({}).toArray();
        resolve(eachUser)
        })
},
deleteUser:(useId)=>{
    return new Promise(async (resolve, reject) => {
        await db.getDatabase().collection(collections.USER_COLLECTION).deleteOne({_id:new ObjectId(useId)})
        resolve()
    })
},
generateRazorPay:(orderId,total)=>{
    return new Promise((resolve, reject) => {
        const razorpay = new Razorpay({
            key_id: 'rzp_test_9d0nC9UaxSoS2k',
            key_secret: 'DtZNmB3LPiLefc7jyyjDF4SA',
            // Add other configuration options as needed
          });
          
          razorpay.orders.create({
            amount: total[0].total*100,
            currency: "INR",
            receipt: orderId,
            notes: {
              key1: "value3",
              key2: "value2"
            }
          }, (error, order) => {
            if (error) {
              console.error("Error creating order:", error);
              // Handle the error appropriately
            } else {
                resolve(order)
              console.log("Order created successfully:", );
              // You can now use the 'order' object as needed
            }
          });
          
    })
},verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require('crypto');
      const secretKey = 'DtZNmB3LPiLefc7jyyjDF4SA';
      const hmac = crypto.createHmac('sha256', secretKey);
  
      hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
      const computedHmac = hmac.digest('hex');
      console.log(computedHmac);
      if (computedHmac === details['payment[razorpay_signature]']) {
        
        resolve('Payment verification successful');
      } else {
        console.log('Payment verification failed');
      }
    });
  },
  changePaymentStatus:(orderId)=>{
   return new Promise((resolve, reject) => {
        db.getDatabase().collection(collections.ORDER_COLLECTION).updateOne({_id:new ObjectId(orderId)},
        {
            $set:{status:'placed'}
        }).then(()=>{
            resolve()
        })
    })
  },
getEachProduct:(proId)=>{
  return new Promise(async(resolve,reject)=>{
  
   let ob= new ObjectId(proId)
    console.log(ob);
      let product = await db.getDatabase().collection(PRODUCT_COLLECTION).findOne({ _id:ob});
      resolve(product)
  })
}

  
}
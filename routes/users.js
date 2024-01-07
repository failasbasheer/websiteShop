var express = require('express');
const userhelpers = require('../helpers/userhelpers');
const { ObjectId } = require('mongodb');
const { getOrderProducts } = require('../helpers/producthelp');
const producthelp = require('../helpers/producthelp');



var router = express.Router();

const verifyLogin=(req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

/* GET users listing. */
router.get('/',verifyLogin, async function(req, res) {
 let user=req.session.user
 let cartCount= await userhelpers.getCartCount(req.session.user._id)
 userhelpers.getUserprod().then((products)=>{
  res.render('user/user-main', { products,user,cartCount});
})


})
router.get('/signup',(req,res)=>{
    
  res.render('user/signup')
})

router.post('/signup',(req,res)=>{
  userhelpers.doSignup(req.body).then((user)=>{
     req.session.user=user
     req.session.user.loggedIn=true
    res.redirect('/')
  })
})

router.get('/login',(req,res)=>{
  if(req.session.user){
    res.redirect('/')
  }else{
  res.render('user/login',{logInErr:req.session.userLogInErr})
  req.session.userLogInErr=false
  }
})

router.post('/login',(req,res)=>{
  userhelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.user=response.user
      req.session.userLoggedIn=true
      res.redirect('/')
    }else{
      req.session.userLogInErr=true
      res.redirect('/login')
    }
  })
})
router.get('/logout',(req,res)=>{
  req.session.user=null
  req.session.userLogInErr=false
  res.redirect('/login')
})

router.get('/cart',verifyLogin,(req,res)=>{
  userhelpers.getCartProducts(req.session.user._id).then(async (cart)=>{
    let cartCount= await userhelpers.getCartCount(req.session.user._id)
    let totalAmount=await userhelpers.getTotalAmount(req.session.user._id)
    let total=0
    if (totalAmount && Array.isArray(totalAmount) && totalAmount.length > 0) {
      total = totalAmount[0].total*10;
      // Your further code...
  } 
    res.render('user/cart',{cart:cart,user:req.session.user,cartCount,total:total})
  })

})

router.get('/add-to-cart/:id',verifyLogin,(req,res)=>{
  let proId=req.params.id
   userhelpers.addToCart(proId,req.session.user._id).then(()=>{
    res.json({status:true})
   })
})

router.post('/delete-cart-product',verifyLogin,async (req,res)=>{
 let proId=req.body.proId
 let userId=req.session.user._id

  userhelpers.deleteCartProduct(proId,userId).then((response)=>{
    res.json(response)
  })


})

router.post('/update-quantity',verifyLogin,(req,res)=>{
 let userId=req.session.user._id
 let proId=req.body.proId
 let quantity=req.body.quantity
let operation=req.body.operation
 userhelpers.updateItemQuantity(proId,operation,userId,quantity).then(async (response)=>{
 response.total=await userhelpers.getTotalAmount(req.session.user._id)
  res.json(response)
 })
})
router.get('/place-order',verifyLogin, async (req,res)=>{
  let userId=req.session.user._id
  let total=await userhelpers.getTotalAmount(userId)
  res.render('user/place-order',{total,user:req.session.user})
})

router.post('/finish-order',verifyLogin,async (req,res)=>{
let products=await userhelpers.getCartProductList(req.session.user._id)
let totalAmount=await userhelpers.getTotalAmount(req.session.user._id)


userhelpers.placeOrder(req.body,products,totalAmount,req.session.user._id).then((response)=>{
  if(req.body['payment-method']=='cod'){
    res.json({mode:'cod'})
  }else{
    userhelpers.generateRazorPay(response,totalAmount).then((response)=>{
      res.json(response)
    })
  }

})
})

router.get('/order-placed',verifyLogin,(req,res)=>{
  res.render('user/order-placed',{user:req.session.user})
})

router.get('/orders',verifyLogin,async (req,res)=>{
  let orders=await userhelpers.getOrders(req.session.user._id)
   res.render('user/orders',{orders:orders,user:req.session.user})
})

router.get("/delete-order-product/:id",(req,res)=>{
  let orderId=req.params.id
   userhelpers.deleteOrder(orderId).then((response)=>{
    res.redirect('/orders')
   })
})

router.get("/view-order-products/:id",verifyLogin,async (req,res)=>{
  let orderId=req.params.id
   let products=await getOrderProducts(orderId)
   res.render('user/order-products',{products,user:req.session.user})
} )

router.post('/verify-payment',verifyLogin,(req,res)=>{
 console.log(req.body);
userhelpers.verifyPayment(req.body).then(()=>{
  userhelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
    console.log('succes mf');
    res.json({status:true})
  })
})
})

router.get("/category/smartphones",verifyLogin,(req,res)=>{
 producthelp.getCategoryProducts('smartphone').then((products)=>{
  console.log(products);
  res.render('user/sections',{products,user:req.session.user})
 })
})

router.get("/category/laptops",verifyLogin,(req,res)=>{
  producthelp.getCategoryProducts('laptop').then((products)=>{
   console.log(products);
   res.render('user/sections',{products,user:req.session.user})
  })
 })

 router.get("/category/speakers",verifyLogin,(req,res)=>{
  producthelp.getCategoryProducts('speaker').then((products)=>{
   console.log(products);
   res.render('user/sections',{products,user:req.session.user})
  })
 })
 router.get("/category/wearables",verifyLogin,(req,res)=>{
  producthelp.getCategoryProducts('wearable').then((products)=>{
   console.log(products);
   res.render('user/sections',{products,user:req.session.user})
  })
 })
 router.get("/category/others",verifyLogin,(req,res)=>{
  producthelp.getCategoryProducts('others').then((products)=>{
   console.log(products);
   res.render('user/sections',{products,user:req.session.user})
  })
 })

 router.get("/product-page/:id",verifyLogin,async (req,res)=>{
  let proID=req.params.id
  let  product= await userhelpers.getEachProduct(proID)
  product._id = product._id.toString();
    console.log(product);
    res.render('user/individualProduct',{product,user:req.session.user})

 })
module.exports = router;

var express = require('express');
const producthelp = require('../helpers/producthelp');
const userhelpers = require('../helpers/userhelpers');
const { response } = require('../app');

var router = express.Router();

const verifyLogin=(req,res,next)=>{
  if(req.session.adminLoggedIn){
    next()
  }else{
    res.redirect('/admin/login')
  }
}

/* GET home page. */
router.get('/',verifyLogin, function(req, res, next) {
  producthelp.getAllProducts().then((products)=>{
    // console.log(products);
    // Assuming you have an array of products called 'productData'
products.forEach((product, index) => {
  product.index = index + 1;
});

// Pass 'productData' to your Handlebars template for rendering

     res.render('admin/view-products', { products ,admin:true});
  })


});

router.get('/products',(req,res)=>{
res.redirect('/admin')
})

router.get('/add-product',(req,res)=>{
  res.render('admin/add-product',{admin:true})
})

router.post('/add-product',(req,res)=>{
  req.body.devicePrice=parseInt(req.body.devicePrice)
  
  
  producthelp.addProduct(req.body,(id)=>{
    let image=req.files.image
    // console.log(id);
    // console.log(__dirname);
    image.mv('./public/product-images/'+id+'.jpg',(err)=>{
    if(!err){
      res.redirect('/admin')
    }else{
      console.log(err);
    }
    })
    
  })
 
})
router.get('/delete-product/:id',(req,res)=>{

  let proId=req.params.id
  producthelp.deleteProduct(proId).then(()=>{
    res.redirect('/admin')
  })
  
})

router.get('/edit-product/:id',(req,res)=>{
let proId=req.params.id
producthelp.findProduct(proId).then((product)=>{
  res.render('admin/edit-product',product)
})

})

router.post('/edit-product/:id',(req,res)=>{
let proId=req.params.id
let image=req.files.image
image.mv('./public/product-images/'+proId+'.jpg')
producthelp.editProduct(proId,req.body).then((product)=>{
  res.redirect('/admin')
})
})

router.get('/all-orders',async (req,res)=>{
  let orders=await producthelp.getOrdersAdmin()
  res.render('admin/all-orders',{orders:orders,admin:true})
})
router.get('/all-users',async (req,res)=>{
  let users=await userhelpers.getAllUsers()
  console.log('this is data');
  console.log(users);
  console.log('this is data');console.log('this is data');
  res.render('admin/all-users',{user:users,admin:true})
})
router.get("/remove-user/:id",(req,res)=>{
  let userId=req.params.id
   userhelpers.deleteUser(userId).then((response)=>{
    res.redirect('/admin/all-users')
   })})

router.get('/login',(req,res)=>{
  res.render('admin/login')
})

router.post('/login',(req,res)=>{
producthelp.admnLogin(req.body).then((response)=>{
  if(response==true){
     req.session.admin=req.body
     req.session.adminLoggedIn=true
     res.redirect('/admin/')
  }else{
    req.session.adminloginErr=true
    let loginErr=req.session.adminloginErr
     res.render('admin/login',{loginErr})
  }
})

})

module.exports = router;

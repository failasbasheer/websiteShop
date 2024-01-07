




function updateQuantity(operation,proId) {
   
    // Perform AJAX request to update the quantity on the server
let currentQuantity=parseInt(document.getElementById(proId).innerHTML)

    $.ajax({
        url:'/update-quantity',
        data:{
          proId:proId,
          operation:operation,
          quantity:currentQuantity
        },
        method:'post',
        success:(response)=>{
         if(response.removeProduct){
          alert("product removed from the cart")
          location.reload()
         }else{
          document.getElementById(proId).innerHTML=currentQuantity+operation
          document.getElementById('total2').innerHTML=response.total[0].total
         }
        }
    });
}

function deleteCartProduct(proId){

  $.ajax({
     url:'/delete-cart-product',
     data:{
      proId:proId
     },
     method:'post',
     success:(response)=>{
      console.log(response);
      alert("product removed from cart")
      location.reload()
      
     }
  })

}


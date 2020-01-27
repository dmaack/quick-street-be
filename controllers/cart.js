const Cart = require("../models/Cart");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");
const stripe = require('stripe') ('pk_test_h1PiAqFdpVJpFn9xYKA1JEX7008fXbJlqI');

// @desc    Get cart
// @route   GET /api/v1.0/customers/:customerId/cart
// @access  Public
exports.getCart = asyncHandler(async (req, res, next) => {
  console.log("customerId cart controller, line 13", req.params.customerId);

  const cart = await Cart.findOne({
    owner: req.params.customerId
  }).populate("items.item", "name price");

  if (!cart) {
    return next(
      new ErrorResponse(
        `No customer with id ${req.params.customerId} owns this cart`,
        404
      )
    );
  }

  res.status(200).json({ success: true, data: cart });
});

// @desc    Create cart to customer
// @route   POST /api/v1.0/customers/:customerId/cart
// @access  Public
exports.addCart = asyncHandler(async (req, res, next) => {
  req.body.owner = req.params.customerId;
  console.log("Creating new cart from customerId", req.body.owner);

  const customer = await Customer.findById(req.params.customerId);
  console.log("what is customer", customer);

  if (!customer) {
    return next(
      new ErrorResponse(
        `No customer with the id of ${req.params.customerId}`,
        404
      )
    );
  }

  const cart = await Cart.findOne({ owner: customer });

  if (!cart) {
    const newCart = await Cart.create(req.body);

    res.status(200).json({
      success: true,
      data: newCart
    });
  } else {
    return next(
      new ErrorResponse(
        `You already have a cart with id ${cart.id} created`,
        400
      )
    );
  }
});

// @desc    Add products to cart
// @route   POST /api/v1.0/customers/:customerId/cart/addtocart
// @access  Public
exports.addItem = asyncHandler(async (req, res, next) => {
  //console.log('add item to cart customerId', req.params.customerId)
  const cart = await Cart.findOne({ owner: req.params.customerId }).populate('items.item', "name price");
  const product = await Product.findById( req.body.productId );
  console.log('product object', product)
  console.log("does cart exists", cart);

  // check if the item was added before
  if (cart) {
    const itemIndex = cart.items.findIndex(
      i => i.item === req.body.productId
     
    );
    console.log('itemIndex', itemIndex);
    if (itemIndex === -1) {
        console.log('product object before pushing onto cart', product)
      cart.items.push(product);

    } else {
      cart.items[itemIndex].quantity += parseInt(req.body.quantity);

      cart.total = cart.items.reduce((acc, itemObj) => {
        console.log('itemObj', itemObj.item)
        if(itemObj.item) {
            return acc + (parseFloat(itemObj.item.price) * parseInt(itemObj.quantity))
        } else {
            return
        }
    }, 0)
    }

    console.log('cart object before reduce function', cart)

   
   
console.log('product price and quatity', product.price, req.body.quantity)
    // cart.total = (
    //   cart.total +
    //   parseFloat(product.price) * parseInt(req.body.quantity)
    // ).toFixed(2);

    cart.save();
    console.log('cart object', cart)

    console.log('cart total', cart.total)

    res
      .status(200)
      .json({ success: true, message: `The Product with the ID ${req.body.productId} was added to your cart`, data: cart });
  } else {
    return next(new ErrorResponse(`shopping cart does not exist`, 400));
  }
});

// @desc    Update products to cart
// @route   PUT /api/v1.0/customers/:customerId/cart/addtocart
// @access  Public
exports.updateItemAfterSwitchVendor = (req, res, next) => {
  Cart.findOne({ owner: req.params.customerId }, function(err, cart) {
    cart.items = [];
    cart.items.push({
      item: req.body.productId,
      price: parseFloat(req.body.price),
      quantity: parseInt(req.body.quantity)
    });

    cart.total = (cart.total + parseFloat(req.body.price)).toFixed(2);

    cart.save();
  });

  res
    .status(200)
    .json({ success: true, message: `The product was updated successfully`, data: cart });
};

// @desc    Delete products from cart
// @route   DELETE /api/v1.0/customers/:customerId/cart/deleteitem/:productId
// @access  Public
exports.deleteItem = (req, res, next) => {
  const product = req.params.productId;
  console.log("product id", product);

  Cart.findOne({ owner: req.params.customerId }, function(err, cart) {
    cart.items = cart.items.filter(item => {
      if (item.item.toString() !== product) {
        return item;
      }
    });

    cart.save();
  });

  res.status(200).json({ success: true, data: {} });
};

// @desc    Delete cart
// @route   DELETE /api/v1.0/customers/:customerId/cart
// @access  Private
exports.deleteCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOneAndDelete(req.body.items);

  if (!cart) {
    return next(new ErrorResponse(`Cart not found`, 404));
  }

  cart.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});


exports.payment = asyncHandler(async (req, res, next) => {
    const stripeToken = req.body.stripeToken; //first we receive a stripe token 
    const currentCharges = Math.round(req.body.stipePayment * 100) // converting to dollars

    stripe.customers.create({ //create a customer and view as admin
        source: stripeToken,
    }).then(function(customer) { // then charge the customer
        return stripe.charges.create({
            amount: currentCharges,
            currency: null,
            customer: customer.id // make sure it's the right customer youre charging
        })
    })

    // res.redirect('/')
})
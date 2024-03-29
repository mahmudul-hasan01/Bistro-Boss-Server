const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.Stripe_Secret_key)
const port = process.env.PORT || 5000

app.use(cors({
  origin: [
    'http://localhost:5173'
  ],
  credentials: true,
}))
app.use(express.json())


const uri = `mongodb+srv://${process.env.USER_ID}:${process.env.USER_PASS}@cluster0.uoehazd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // await client.connect(); 

    const users = client.db("BistroDB").collection("Users");
    const menu = client.db("BistroDB").collection("Menu");
    const reviews = client.db("BistroDB").collection("Reviews");
    const carts = client.db("BistroDB").collection("Cart");
    const payments = client.db("BistroDB").collection("payments");

    // jwt token

    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.JWT_TOKEN, { expiresIn: '1h' })
      res.send({ token })
    })

    // verify token
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ massege: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.JWT_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ massege: 'unauthorized access' })
        }
        req.decoded = decoded
        next()
      })
    }

    // verify admin 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await users.findOne(query)
      const isAdmin = user?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({ massege: 'forbidden access' })
      }
      next()
    }

    // user

    app.get('/users',verifyToken,verifyAdmin, async (req, res) => {
      const result = await users.find().toArray()
      res.send(result)
    })


    app.post('/users',verifyToken, verifyAdmin, async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const existingUser = await users.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await users.insertOne(user)
      res.send(result)
    })

    app.delete('/users/:id',verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await users.deleteOne(query)
      res.send(result)
    })

    app.patch('/users/admin/:id',verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await users.updateOne(query, updatedDoc)
      res.send(result)
    })

    //menu

    app.get('/menu', async (req, res) => {
      const result = await menu.find().toArray()
      res.send(result)
    })


    app.get('/menuItem/:id', async (req, res) => {
      const id = req.params.id
      const result = await menu.findOne({ _id: id })
      res.send(result)
    })

    app.post('/menu',verifyToken, verifyAdmin, async (req, res) => {
      const manuItem = req.body
      const result = await menu.insertOne(manuItem)
      res.send(result)
    })

    app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await menu.deleteOne(query)
      res.send(result)
    })

    app.patch('/menu/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const item = req.body
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }
      const result = await menu.updateOne(query, updatedDoc)
      res.send(result)
    })

    //review

    app.get('/reviews', async (req, res) => {
      const result = await reviews.find().toArray()
      res.send(result)
    })

    // cart

    app.get('/carts', async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const result = await carts.find(query).toArray()
      res.send(result)
    })

    app.post('/carts', async (req, res) => {
      const cart = req.body
      const result = await carts.insertOne(cart)
      res.send(result)
    })

    app.delete('/cart/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await carts.deleteOne(query)
      res.send(result)
    })

    // Payment

    app.get('/payment/:email',verifyToken, async (req, res) => {
      // const payment = req.body
      const query = {email: req?.params?.email}
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({ massege: 'forbidden access' })
      }
      const result = await payments.find(query).toArray()
      res.send(result)
    })

    app.post('/payment', async (req, res) => {
      const payment = req.body
      const paymentResult = await payments.insertOne(payment)
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      }
      const deleteResult = await carts.deleteMany(query)
      res.send({paymentResult,deleteResult})
    })

    app.post('/payment-intent', async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Bistro Boss')
})

app.listen(port, () => {
  console.log(`Bistro Boss ${port}`)
})
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken')
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

    app.post('/menu',verifyToken, verifyAdmin, async (req, res) => {
      const manu = req.body
      const result = await menu.insertOne(manu)
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
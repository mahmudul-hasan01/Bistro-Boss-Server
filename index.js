const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
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

        const menu = client.db("BistroDB").collection("Menu");
        const reviews = client.db("BistroDB").collection("Reviews");
        const carts = client.db("BistroDB").collection("Cart");

        //menu

        app.get('/menu', async (req, res) => {
            const result = await menu.find().toArray()
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
        
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cart.deleteOne(query)
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
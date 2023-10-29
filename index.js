const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))

app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6aqk9ji.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = (req, res, next) => {
  console.log('called : ', req.host, req.originalUrl);
  next()
}
const verifyToken = async(req, res, next) => {
  const token = req.cookies?.token;
  console.log('value of the token in middle ware', token);
  if(!token){
    return res.status(401).send({message: 'Not authorized'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      console.log(err);
      return res.status(400).send({message : 'unauthorized'})
    }
    console.log('value of the decoded', decoded);
    req.user = decoded
    next()
  })

}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const carCollection = client.db('carDoctor').collection('services')
    const bookingCollection = client.db('carDoctor').collection('bookings')

    // auth jwt related
    app.post('/jwt', logger, async(req, res) => {
      const user = req.body;
      console.log(user);
      // const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: false,
  
      })
      .send({success: true})
    })

    // services related api
    app.get('/services', async(req, res) => {
        const cursor = carCollection.find()
        const result = await cursor.toArray()
        res.send(result) 
    })

    app.get('/services/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await carCollection.findOne(query)
      res.send(result)
    })

    app.get('/bookings', logger, verifyToken, async(req, res) => {
      console.log(req.query);
      // console.log('token..', req.cookies.token);
       console.log('user in the valid token', req.user);

        if(req.query.email !== req.user.email){
          return res.status(403).send({message: 'forbidden access'})
        }

      let query = {}
      if(req.query?.email){
        query = {email : req.query?.email}
      }
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/bookings', async(req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking)
     
      res.send(result)
    }) 

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
    
      console.log(updatedBooking);
    
      const updateDoc = {
        $set: {
          status: updatedBooking.status
          
        }
      };
    
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

  
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Car is going..')
})
app.listen(port, () => {
    console.log(`Car is running now ${port}`);
})
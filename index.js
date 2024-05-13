const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// middleware
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://hotel-luxury-6656d.web.app',
        'https://hotel-luxury-6656d.firebaseapp.com'

    ],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// verify jwt middleware
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token
    if (!token) return res.status(401).send({ message: 'unauthorized access' })
    if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                // console.log(err)
                return res.status(401).send({ message: 'unauthorized access' })
            }
            // console.log(decoded)

            req.user = decoded
            next()
        })
    }
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ihwvydu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const hotelRoomCollection = client.db('hotelLuxury').collection('rooms');
        const bookingsCollection = client.db('hotelLuxury').collection('bookings');

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const email = req.body
            const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '30d',
            })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true })
        })

        // Clear token 
        app.get('/logout', (req, res) => {
            res
                .clearCookie('token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                    maxAge: 0,
                })
                .send({ success: true })
        });



        // room related api
        app.get('/all-rooms', async (req, res) => {
            const filter = req.query.filter;
            let query={};
            if (filter) query.price_range = filter
            // if(filter) query= {price_range};
            const cursor = hotelRoomCollection.find(query);
            const result = await cursor.toArray();

            res.send(result);
        });
        app.get('/all-rooms/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await hotelRoomCollection.findOne(query);
            res.send(result)
        });

        app.post('/booking', async (req, res) => {
            const bookingData = req.body;

            // check if its a duplicate request
            const query = {
                email: bookingData.email,
                roomId: bookingData.roomId

            }
            const alreadyBooked = await bookingsCollection.findOne(query)
            
            if (alreadyBooked) {
                return res
                    .status(400)
                    .send('You have already booked this room.')
            }

            const result = await bookingsCollection.insertOne(bookingData);
            res.send(result)
        });
        app.get('/booking/:email', verifyToken, async (req, res) => {
            const tokenEmail = req.user.email
            const email = req.params.email
            if (tokenEmail !== email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const result = await bookingsCollection.find({ email: req.params.email }).toArray();

            res.send(result);
        });
        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookingsCollection.deleteOne(query)
            res.send(result)
        })
        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id
            const date = req.body
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: date,
            }
            const result = await bookingsCollection.updateOne(query, updateDoc)
            res.send(result)
        })
        // Update  status
        app.patch('/status/:id', async (req, res) => {
            const id = req.params.id
            const status = req.body
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: status,
            }
            const result = await hotelRoomCollection.updateOne(query, updateDoc)
            res.send(result)
        })








        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






















app.get('/', (req, res) => {
    res.send('Hotel Luxury is running');
});

app.listen(port, () => {
    console.log(`HOTEL LUXURY IS RUNNING ON PORT ${port}`)
});

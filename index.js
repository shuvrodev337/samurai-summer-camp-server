const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//Middleware

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World! Samurai Server is running!!");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ez2ieyu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection = client.db("samuraiDB").collection("usersCollection");
    const classesCollection = client.db("samuraiDB").collection("classesCollection");
    // MongoDB CRUD Operations Here



    // --------Users Related APIs-------//
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    // ---Inserting user to db---//
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists in Database" });
      }
      if (!user.role) {
        user.role = 'student'
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // ---Getting All Users---//
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray() 
      res.send(result)
    })
    // // ---Getting  User id---//
    // app.get('/users/:id', async (req, res) => {
    //   // const result = await usersCollection.find().toArray() 
    //   // res.send(result)
    // })

    // ---promoting A User to Instructor---//
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })
    // ---promoting A User to Admin--- //
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    // --------Class Related APIs-------//
    
    // ---Add class by Instructor---//
    app.post("/classes", async (req, res) => {
      const addedClass = req.body;
      
      // TODO make a query in usersCollection to find the _id of the instructor 
      // then add instructorId field to the class
      const instructorEmail = addedClass.instructorEmail
      const query = {email: instructorEmail}
     const instructor = await usersCollection.findOne(query)
     if (instructor) {
      addedClass.instructorId = instructor._id
     }
      if (!addedClass.status) {
        addedClass.status = 'pending'
      }
      const result = await classesCollection.insertOne(addedClass);
      res.send(result);
    });

    // --- Load Instructor id specific Classes---//

    // app.get("/instructor/classes/:id", async (req, res) => {
    //   const id = req.params.id
    //   const query = {instructorId: new ObjectId(id)}
    //   const result = await classesCollection.find(query).toArray()
    //   res.send(result);
    // });

    // --- Load Instructor email specific Classes---//

    app.get("/instructors/classes/:email", async (req, res) => {
      const email = req.params.email
      const query = {instructorEmail: email}
      const result = await classesCollection.find(query).toArray()
      res.send(result);
    });







    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`My Samurai app listening on port ${port}`);
});

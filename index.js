const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const jwt = require('jsonwebtoken');
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

// JWT Verification
const verifyJWT = (req, res, next) => {
  console.log('came to verify jwt');
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ error: true, message: "Unauthorized Access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const selectedClassesCollection = client.db("samuraiDB").collection("selectedClassesCollection");
    // MongoDB CRUD Operations Here



  // ------------jwt related APIs------------------// 
app.post('/jwt', (req,res)=>{

  const user = req.body
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'1h'})
  res.send({token})
})


    // -------------Users Related APIs------------//
    
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
    app.get('/users',verifyJWT, async (req, res) => {
      // console.log(req.decoded?.email);

      const result = await usersCollection.find().toArray() 
      res.send(result)
    })
    
   

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

    // ---Getting All Instructors---//

    app.get('/instructors', async (req, res) => {
      const filter = {role: 'instructor'}
      const result = await usersCollection.find(filter).toArray() 
      res.send(result)
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

    // -------------Class Related APIs------------//
    
    // ---Add class by Instructor---//
    app.post("/classes", async (req, res) => {
      const addedClass = req.body;
      const instructorEmail = addedClass.instructorEmail
      const query = {email: instructorEmail}
     const instructor = await usersCollection.findOne(query)
     if (instructor) {
      addedClass.instructorId = instructor._id
     }
      if (!addedClass.status) {
        addedClass.status = 'pending'
      }
      if (!addedClass.enrolledStudents) {
        addedClass.enrolledStudents = 0
      }
      const result = await classesCollection.insertOne(addedClass);
      res.send(result);
    });


    //--- Load All Classes ---//
       app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray()
      res.send(result);
    });


    // ---Approve a class---//

   
    app.patch('/classes/approved/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'approved'
        },
      };

      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);

    })
    // ---Deny a class---//

   
    app.patch('/classes/denied/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'denied'
        },
      };

      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    //--- Load All Approved Classes ---//
    app.get("/classes/approved", async (req, res) => {
      const query = {status: 'approved' }
      const result = await classesCollection.find(query).toArray()
      res.send(result);
    });


    // --- Load instructor-email specific Classes---//

    app.get("/instructors/classes", async (req, res) => {
      const email = req.query.email
      const query = {instructorEmail: email}
      const result = await classesCollection.find(query).toArray()
      res.send(result);
    });
    
//---find the class, with id, then update the feedback field with tha data coming from client-side---//
app.patch('/classes/feedback/:id', async (req, res) => {
  const id = req.params.id;
  const feedback = req.body.feedback
  console.log(id);
  console.log(req.body);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      feedback: feedback
    },
  };

  const result = await classesCollection.updateOne(filter, updateDoc);
  res.send(result);

})

// ----------------------User Selected Classes related APIS---------------------------//

app.post('/users/classes', async (req, res) => {
  const selectedClass = req.body;
  const email = selectedClass.studentEmail
  const query =  {email: email}
  const student = await usersCollection.findOne(query)
  if (!selectedClass?.studentId) {
    selectedClass.studentId = student._id
  }
  const result = await selectedClassesCollection.insertOne(selectedClass);
  res.send(result);
})

//  ---Load user selected classes--- //

app.get("/users/classes", async (req, res) => {
  const email = req.query.email
  const query = {studentEmail: email}
  const result = await selectedClassesCollection.find(query).toArray()
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

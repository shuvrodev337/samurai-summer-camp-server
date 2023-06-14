const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");

const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//Middleware

// const corsOptions = {
//   origin: "*",
  
//   credentials: true,
//   optionSuccessStatus: 200,
 
// };

// app.use(cors(corsOptions));
app.use(cors());
app.use(express.json());

// JWT Verification
const verifyJWT = (req, res, next) => {
  // console.log('came to verify jwt');
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
    // await client.connect();
    const usersCollection = client.db("samuraiDB").collection("usersCollection");
    const classesCollection = client.db("samuraiDB").collection("classesCollection");
    const selectedClassesCollection = client.db("samuraiDB").collection("selectedClassesCollection");
    const paymentCollection = client.db("samuraiDB").collection("payments");
    const marttialArtsCollection = client.db("samuraiDB").collection("martialArts");
    // MongoDB CRUD Operations Here



  // ------------jwt related APIs------------------// 
app.post('/jwt', (req,res)=>{

  const user = req.body
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'1h'})
  res.send({token})
})

//----------------------------------------------//

//-----------Verify Admin and Verify Instructor-----------------------//

// Middleware: verifyAdmin

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email }
  const user = await usersCollection.findOne(query);
  if (user?.role !== 'admin') {
    return res.status(403).send({ error: true, message: 'forbidden message' });
  }
  next();
}
// Middleware: verifyInstructor

const verifyInstructor = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email }
  const user = await usersCollection.findOne(query);
  if (user?.role !== 'instructor') {
    return res.status(403).send({ error: true, message: 'forbidden message' });
  }
  next();
}
//-------------------------------------------------------------------//





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

      //---Check if the user is admin or not // api call from isAdmin hook---//
  app.get('/users/admin', verifyJWT,async (req,res)=>{
    const email = req.query.email
    // If the user from the token and the user whose admin verification is being checked are not same then,
    if (req.decoded.email !== email) {
      res.send({admin:false}) 
    }
    // If the user from the token and the user whose admin verification is being checked are same
    const query = {email:email}
    const user = await usersCollection.findOne(query)
    const result = {admin:user?.role === 'admin'} // isAdmin e true or false debe
    res.send(result)

  })


      //--- Check if the user is Instructor or not // api call from isInstructor hook---//
  app.get('/users/instructor', verifyJWT,async (req,res)=>{
    const email = req.query.email
    // If the user from the token and the user whose instructor verification is being checked are not same then,
    if (req.decoded.email !== email) {
      res.send({instructor:false}) 
    }
    // If the user from the token and the user whose instructor verification is being checked are same
    const query = {email:email}
    const user = await usersCollection.findOne(query)
    const result = {instructor:user?.role === 'instructor'} // isInstructor e true or false debe
    res.send(result)

  })





    // ---Getting All Users---//
    app.get('/users',verifyJWT,verifyAdmin, async (req, res) => {
     
      const result = await usersCollection.find().toArray() 
      res.send(result)
    })
    //Getting All martial arts
    app.get('/martialArts', async (req, res) => {
     
      const result = await marttialArtsCollection.find().toArray() 
      res.send(result)
    })
    
   

    // ---promoting A User to Instructor---//
    app.patch('/users/instructor/:id',verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor',
          numberOfStudents: 0
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
    app.patch('/users/admin/:id',verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      // console.log(id);
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
    app.post("/classes",verifyJWT,verifyInstructor, async (req, res) => {
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
       app.get("/classes",verifyJWT,verifyAdmin, async (req, res) => {
      const result = await classesCollection.find().toArray()
      res.send(result);
    });


    // ---Approve a class---//

   
    app.patch('/classes/approved/:id',verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      // console.log(id);
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

   
    app.patch('/classes/denied/:id',verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      // console.log(id);
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
   //TODO check verifyJWT is needed in this api
    app.get("/instructors/classes", async (req, res) => {
      const email = req.query.email
      const query = {instructorEmail: email}
      const result = await classesCollection.find(query).toArray()
      res.send(result);
    });
    
    //--- An adminSending feedback to Instructor---//
//---find the class, with id, then update the feedback field with tha data coming from client-side---//
app.patch('/classes/feedback/:id',verifyJWT,verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const feedback = req.body.feedback

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


//---student selects a class,then adding to DB---//
app.post('/users/classes',verifyJWT, async (req, res) => {
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
app.delete('/users/selectedclass/:id',verifyJWT, async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) };

  const result = await selectedClassesCollection.deleteOne(query);
  res.send(result);
})



//  ---Load user selected classes--- //

app.get("/users/classes",verifyJWT, async (req, res) => {
  const email = req.query.email
  const query = {studentEmail: email}
  const result = await selectedClassesCollection.find(query).toArray()
  res.send(result);
});
// Delete a selected class

// /users/selectedclass/${_id}
app.delete("/users/selectedclass/:id",verifyJWT, async (req, res) => {
  const id = req.params.id
  const query = {_id: new ObjectId(id)}
  const result = await selectedClassesCollection.deleteOne(query).
  res.send(result);
});

//  ---Load user enrolled classes--- //

app.get("/users/enrolledClasses",verifyJWT, async (req, res) => {
  const email = req.query.email
  const query = {studentEmail: email}
  const result = await paymentCollection.find(query).sort({ date: -1 }).toArray()
  res.send(result);
});

// ---------------Payment related Apis ----------------------//

 // create payment intent Api
 app.post('/create-payment-intent', verifyJWT, async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'inr',
    payment_method_types: ['card']
  });

  res.send({
    clientSecret: paymentIntent.client_secret
  })
})
// Payment api
app.post('/payments', verifyJWT, async (req, res) => {
  const payment = req.body;
  const insertResult = await paymentCollection.insertOne(payment);
  const id = payment?.selectedClassId
  const query = {_id : new ObjectId(id) }
  const deleteResult  = await selectedClassesCollection.deleteOne(query)
//   const updatedClass = await classesCollection.updateOne(
//     { _id: ObjectId(id) },
//     { $inc: { availableSeats : -1, enrolledStudents: 1 } },
//     // { returnOriginal: false }
//   ); 
  
// const instructorId = payment?.instructorId
// const updateInstructor  = await usersCollection.updateOne(
//   { _id: ObjectId(instructorId) },
//     { $inc: {  numberOfStudents: 1 } },
//     // { returnOriginal: false }
// )

  res.send({ insertResult, deleteResult });
})
// Update class

app.patch('/classes/update/:id',verifyJWT, async (req, res) => {
  const id = req.params.id;
  const filter = { instructorId: new ObjectId(id) };
  const updateDoc = {
    // $inc: {  enrolledStudents: 1 },
    $inc: { availableSeats : -1, enrolledStudents: 1 },
  };

  const result = await classesCollection.updateOne(filter, updateDoc);
  res.send(result);

})

//Update Instructor
app.patch('/instructors/update/:id',verifyJWT, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $inc: { numberOfStudents: 1 },
  };

  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);

})



    // ---Load most popular classes---//

    app.get("/classes/popular", async (req, res) => {
 
      const query = {enrolledStudents: -1}
      const result = await classesCollection.find().sort(query).limit(6).toArray()

      
      res.send(result);
});
    // ---Load most popular Instructors---//

    app.get("/instructors/popular", async (req, res) => {

      const query = {numberOfStudents: -1}
      const result = await usersCollection.find().sort(query).limit(6).toArray()

      
      res.send(result);
});





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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

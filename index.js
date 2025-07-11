const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middle ware

app.use(cors());
app.use(express.json());







const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7twsfn9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // jobs related API 
    const jobsCollection = client.db('jobportalDB').collection('jobs');

    // post a job using POST method
    app.post('/jobs', async(req, res) =>{
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send(result);
    })
// get all jobs using GET API method
    app.get('/jobs', async(req, res) => {
      const cursor = jobsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    //get a job using GET API method and params

    app.get('/jobs/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    })


    //post job applications using POST API method
      const jobApplicationsCollection = client.db('jobportalDB').collection('job_applications');

    app.post('/job-applications', async(req, res) => {
      const application = req.body;
      const result = await jobApplicationsCollection.insertOne(application);
      res.send(result);
    })

    //get zero data or one data or many data [0, 1, many]
    app.get('/job-applications', async(req, res) =>{
      const email = req.query.email;
      const query = { applicant_email: email};
      const result = await jobApplicationsCollection.find(query).toArray();

      for(const application of result) {
        const query1 = {_id: new ObjectId(application.job_id)}
        const job =  await jobsCollection.findOne(query1);
        if(job) {
          application._id = job._id;
          application.title = job.title;
          application.company = job.company;
          application.company_logo = job.company_logo;
          application.location = job.location;
          application.applicationDeadline = job.applicationDeadline;
          application.jobType = job.jobType;
        }
      }
      res.send(result);
    })

   


  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Job is falling from the sky! ');
})

app.listen(port, () => {
    console.log(`Job is waiting at port: ${port}`);
})
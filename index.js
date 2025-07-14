const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7twsfn9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB!");

    // Collections
    const db = client.db('jobportalDB');
    const jobsCollection = db.collection('jobs');
    const jobApplicationsCollection = db.collection('job_applications');

    // ----------- API ROUTES -----------

    // ✅ Post a new job
    app.post('/jobs', async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send(result);
    });

    // ✅ Get all jobs (optionally filtered by HR email)
    app.get('/jobs', async (req, res) => {
      const email = req.query.email;
      const query = email ? { hr_email: email } : {};
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // ✅ Get single job by ID
    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const result = await jobsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    }); 

   

    // ✅ Submit a job application
    app.post('/job-applications', async (req, res) => {
      const application = req.body;

      // Save application
      const result = await jobApplicationsCollection.insertOne(application);

      // Safely convert job_id to ObjectId
      let jobId;
      try {
        jobId = new ObjectId(application.job_id);
      } catch (err) { 
        return res.status(400).send({ error: 'Invalid job_id format' });
      }

      // Find job & update application count
      const job = await jobsCollection.findOne({ _id: jobId });
      const newCount = job?.applicationCount ? job.applicationCount + 1 : 1;

      const updateDoc = {
        $set: { applicationCount: newCount },
      };

      await jobsCollection.updateOne({ _id: jobId }, updateDoc);

      // ✅ Respond with insertedId for frontend
      res.send({ insertedId: result.insertedId });
    });

    // ✅ Get applications for a user (with job details)
    app.get('/job-applications', async (req, res) => {
      const email = req.query.email;
      const applications = await jobApplicationsCollection
        .find({ applicant_email: email })
        .toArray();

      const enrichedResults = await Promise.all(applications.map(async (application) => {
        try {
          const job = await jobsCollection.findOne({ _id: new ObjectId(application.job_id) });
          if (job) {
            return {
              ...application,
              _id: job._id, // use job's ID for UI consistency
              title: job.title,
              company: job.company,
              company_logo: job.company_logo,
              location: job.location,
              applicationDeadline: job.applicationDeadline,
              jobType: job.jobType,
            };
          }
        } catch (error) {
          console.error("Failed to enrich application:", error.message);
        }
        return application;
      }));

      res.send(enrichedResults);
    }); 

     //Get applications for a specific job using job_id

    app.get('/job-applications/jobs/:job_id', async (req, res) => {
      const jobId = req.params.job_id;
      const query ={ job_id: jobId};
      const result = await jobApplicationsCollection.find(query).toArray();
      res.send(result);
    })

  } finally {
    // Optional: keep MongoDB connection alive for server
    // await client.close();
  }
}

run().catch(console.dir);

// ✅ Default Route
app.get('/', (req, res) => {
  res.send('🌟 Job is falling from the sky!');
});

// ✅ Start Server
app.listen(port, () => {
  console.log(`🚀 Job server running on port: ${port}`);
});

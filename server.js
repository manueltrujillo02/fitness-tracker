require('dotenv').config()
const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const morgan = require('morgan'); // used to see requests
const db = require('./models');
const axios = require('axios');

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI);

const isAuthenticated = require("./config/isAuthenticated");
const auth = require("./config/auth");

// Setting CORS so that any website can
// Access our API
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-type,Authorization');
  next();
});

//log all requests to the console
app.use(morgan('dev'));

// Setting up express to use json and set it to req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/appDB', { useNewUrlParser: true, useCreateIndex: true })
  .then(() => console.log("MongoDB Connected!"))
  .catch(err => console.error(err));






// AUTHENTICATION ROUTES

// LOGIN ROUTE
app.post('/api/login', (req, res) => {
  auth
    .logUserIn(req.body.email, req.body.password)
    .then(dbUser => res.json(dbUser))
    .catch(err => res.status(400).json(err));
});

// SIGNUP ROUTE
app.post('/api/signup', (req, res) => {
  console.log(req.body)
  db.User.create(req.body)
    .then(data => res.json(data))
    .catch(err => res.status(400).json(err));
});

// Any route with isAuthenticated is protected and you need a valid token
// to access
app.get('/api/user/:id', isAuthenticated, (req, res) => {
  db.User.findById(req.params.id).then(data => {
    if (data) {
      res.json(data);
    } else {
      res.status(404).send({ success: false, message: 'No user found' });
    }
  }).catch(err => res.status(400).send(err));
});





// MESSAGING ROUTES

// send user a message
app.post('/api/sendmessage', (req, res) => {
  // console.log("hit server")
  db.Message.create({
    username: req.body.username,
    message: req.body.message,
    sender: req.body.sender
  })
    .then(data => {
      res.json(data);
    }).catch(err => res.status(400).send(err));
});

//display messages 
app.get('/api/messages/:username', (req, res) => {
  // console.log(req.params.username)
  db.Message.find({
    username: req.params.username
  })
    .then(data => {
      // console.log(data)
      res.json(data);
    }).catch(err => res.status(400).send(err));
})

// get unread messages for count
app.get('/api/count/:username', (req, res) => {
  // console.log(req.params.username)
  db.Message.find({
    username: req.params.username,
    read: false
  })
    .then(data => {
      // console.log(data)
      res.json(data);
    }).catch(err => res.status(400).send(err));
})

// mark message as read 
app.post("/api/messages/:id", (req, res) => {
  db.Message.findById(req.params.id)
    .update(
      {
        read: true
      }
    )
    .then(data => {
      if (data) {
        res.json(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
})

// delete a message 
app.post("/api/delete/:id", (req, res) => {
  console.log("hitting server")
  db.Message.findOneAndRemove({ _id: req.params.id })
    .then(data => {
      if (data) {
        res.json(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
})






// PROFILE ROUTES

// UPDATE USER
app.put('/api/update/:id', (req, res) => {
  console.log(req.body)
  db.User.findByIdAndUpdate(req.params.id,
    {
      name: req.body.name,
      feet: req.body.feet,
      inches: req.body.inches,
      age: req.body.age
    }
  )
    .then(data => {
      if (data) {
        console.log(data);
        res.send(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
});

app.put('/api/create/:id', (req, res) => {
  console.log(req.body)
  db.User.findByIdAndUpdate(req.params.id,
    {
      name: req.body.name,
      feet: req.body.feet,
      inches: req.body.inches,
      age: req.body.age
    }
  )
    .then(data => {
      if (data) {
        console.log(data);
        res.send(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
});



// Serve up static assets (usually on heroku)
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
}

app.get('/', isAuthenticated /* Using the express jwt MW here */, (req, res) => {
  res.send('You are authenticated'); //Sending some response when authenticated
});





// CALENDAR ROUTES

app.post('/api/calendar/:userId', (req, res) => {

  db.Calendar.create(req.body)
    .then(function (dbCalendar) {
      // If a Note was created successfully, find one User (there's only one) and push the new Note's _id to the User's `notes` array
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.User.findOneAndUpdate({ _id: req.params.userId }, { $push: { calendar: dbCalendar._id } }, { new: true });
    })
    .then(function (dbUser) {
      // If the User was updated successfully, send it back to the client
      res.json(dbUser);
    })
    .catch(function (err) {
      // If an error occurs, send it back to the client
      res.json(err);
    });
});


app.get('/calendar/:userId', (req, res) => {
  db.User
    .findOne({ _id: req.params.userId })
    .populate("calendar")
    .then(data => {
      if (data) {
        res.json(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
});

app.put('/api/update/calendar/:id', (req, res) => {
  db.Calendar.findByIdAndUpdate(req.params.id,
    {
      title: req.body.title,
      start: req.body.start,
      end: req.body.end
    }
  )
    .then(data => {
      if (data) {
        res.json(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
});

app.delete('/api/delete/calendar/:id', (req, res) => {
  db.Calendar.findByIdAndRemove(req.params.id)
    .then(data => {
      if (data) {
        res.json(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
});






// CALORIES ROUTES 
app.post('/api/calories/:userId', (req, res) => {
  console.log("reached server")
  db.Calories.create({
    userID: req.params.userId,
    consumed: req.body.consumed,
    burned: req.body.burned,
    date: req.body.date
  })
    .then(data => {
      if (data) {
        res.json(data)
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => console.log(err));
});

app.get('/calories/:userId', (req, res) => {
  db.Calories
    .find({
      userID: req.params.userId
    })
    .then(data => {
      if (data) {
        console.log(data)
        res.json(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
});

app.put('/api/update/calories/:id', (req, res) => {
  db.Calories.findByIdAndUpdate(req.params.id,
    {
      title: req.body.title,
      start: req.body.start,
      end: req.body.end
    }
  )
    .then(data => {
      if (data) {
        res.json(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
});

app.delete('/api/delete/calories/:id', (req, res) => {
  db.Calories.findByIdAndRemove(req.params.id)
    .then(data => {
      if (data) {
        res.json(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
});





// WEIGHT ROUTES

app.post('/api/weight/:userId', (req, res) => {
  console.log("reached server")
  db.Weight.create({
    userID: req.params.userId,
    weight: req.body.weight,
    date: req.body.date
  })
    .then(data => {
      if (data) {
        res.json(data)
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => console.log(err));

});

app.get('/weight/:userId', (req, res) => {
  db.Weight
    .find({
      userID: req.params.userId
    })
    .then(data => {
      if (data) {
        console.log(data)
        res.json(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
});

app.put('/api/update/weight/:id', (req, res) => {
  db.Weight.findByIdAndUpdate(req.params.id,
    {
      weight: req.body.weight,
      date: req.body.date
    }
  )
    .then(data => {
      if (data) {
        res.json(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
});

app.delete('/api/delete/weight/:id', (req, res) => {
  db.Weight.findByIdAndRemove(req.params.id)
    .then(data => {
      if (data) {
        res.json(data);
      } else {
        res.status(404).send({ success: false, message: 'No user found' });
      }
    }).catch(err => res.status(400).send(err));
});






// INTERACT WITH FOOD API ROUTES

app.get('/api/foodcalories/:quantity/:size/:food', (req, res) => {
  var query = `https://api.edamam.com/api/nutrition-data?app_id=582634e3&app_key=706b87d8c66c0a186041c148f14d051c%20&ingr=${req.params.quantity}%20${req.params.size}%20${req.params.food}`
  console.log(query)
  axios.get(query)
    .then(response => {
      console.log(response.data)
      res.json(response.data)
    })
    .catch(err => res.status(400).json(err));
});




// Error handling
app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') { // Send the error rather than to show it on the console
    res.status(401).send(err);
  }
  else {
    next(err);
  }
});

// Send every request to the React app
// Define any API routes before this runs
app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build/index.html"));
});

app.listen(PORT, function () {
  console.log(`🌎 ==> Server now on port ${PORT}!`);
});

const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: false}))
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const mongoose = require('mongoose');
const { Schema } = mongoose;

let Exercise, User, Log;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const exerciseSchema = new Schema({
  username: String,
  description: String,
  duration: Number,
  date: String,
  _id: String
});

const userSchema = new Schema({
  username: String
});

const logSchema = new Schema({
  username: String,
  count: Number,
  _id: String,
  log: [Object]
});

Exercise = mongoose.model('Exercise',exerciseSchema);
User = mongoose.model('User',userSchema);
Log = mongoose.model('Log',logSchema);



app.get('/api/users',async function(req, res){
  let users = await User.find();
  console.log("users : ",users);
  res.json(users);
})

app.post('/api/users',async function(req,res){
  let username = req.body.username;
  let user = await User.create({username: username});
  console.log("user : ", user);
  let newUser = {};
  newUser.username = user.username;
  newUser._id = user._id;
  res.json(newUser);
})

app.post('/api/users/:_id/exercises', async function(req,res){
  const id = req.params._id;
  console.log("id",id)
  const user = await User.findById(id);
  req.body.date = req.body.date ? req.body.date : new Date();
  if (user) {
    const exercise = await Exercise.findOneAndUpdate({_id:id},{
      username: user.username,
      description: req.body.description,
      duration: req.body.duration,
      date: new Date(req.body.date).toDateString(),
      _id: id
    }, {upsert: true, new:true})
    
    await Log.findOneAndUpdate({_id:id}, {
      username: user.username,
      $inc :{count : 1},
      _id: id,
      $push :{log:{
         description: req.body.description,
         duration: req.body.duration,
         date: new Date(req.body.date).toDateString()
      }}
    }, {upsert: true, new:true})

    const newExercise = {};
    newExercise._id = exercise._id
    newExercise.username = exercise.username 
    newExercise.date = exercise.date
    newExercise.duration = exercise.duration
    newExercise.description = exercise.description
    res.json(newExercise);
  } else {
   res.json({error: 'invalid id'});
  }
})

app.get('/api/users/:_id/logs', async function(req,res){
  const id = req.params._id;
  const logs = await Log.findOne({_id:id});
  let onlyLogs = logs.log;
  console.log("onlyLogs ",onlyLogs)
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);
  const limit = req.query.limit;
  if (from.toString() !== 'Invalid Date' && to.toString() !== 'Invalid Date') {
    const temp= [];
    onlyLogs.forEach(element => {
      let date = new Date(element.date)
      if (date > from && date < to)
        temp.push(element);
    });
    onlyLogs = temp;
  }
  if (limit) 
    onlyLogs.splice(limit);
  
  onlyLogs.forEach(element =>{
    element.duration = Number(element.duration)
  })
  logs.log = onlyLogs;
  const newLogs = {}
  newLogs._id = logs._id
  newLogs.username = logs.username
  newLogs.count = logs.count
  newLogs.log = logs.log
  res.json(newLogs);
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

//mongoose configuration
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//mongoose connection
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
mongoose.connection.once('open', () => {
  console.log('Connected !!');
});

//mongoose schema
const Schema = mongoose.Schema;

const userSchema = new Schema({ 
  username: {
    type: String,
    required: true,
  },
  exercises: [{
    description: { type: String },
    duration: { type: Number },
    date: { type: String }
  }]
});

const userModel = mongoose.model('user', userSchema);

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.post('/api/users', (req, res, next) => {

  const {username} = req.body;

  if(!username) {
    return next({message: 'Please insert a username'});
  }

  const data = new userModel({
    username: username
  });


  data.save( error => {
    if(error) {
      console.log('Error saving db, error : '+error);
    }
  }); 

  
  res.json({
    username: data.username,
    _id: data._id
  })
});

app.get('/api/users', async (req, res, next) => {

  const data = await userModel.find();

  res.send(data);
});

app.post('/api/users/:id/exercises', async (req, res, next) =>{

  const userId = req.params.id || req.body.id; 
  
  const exerciseData = { 
    description: req.body.description,
    duration: +req.body.duration,
    date: req.body.date || new Date().toDateString()
  };

  userModel.findByIdAndUpdate(
    userId, // find user by _id
    {$push: { exercises: exerciseData } }, // add exerciseData to exercices[]
    {new: true},
    function (err, updatedUser) {
      if(err) {
        console.log('update error:',err);
        return next({message: 'add exercises findByIdAndUpdate error: '+err})
      }
      let returnObj = {
        username: updatedUser.username,
        description: exerciseData.description,
        duration: exerciseData.duration,
       _id: userId,
        date: new Date(exerciseData.date).toDateString()
      };
      res.json(returnObj);
    }
  );
});

app.get('/api/users/:id/logs', async (req, res, next) => {

  const result = {};//result will be returned
  const userId = req.params.id || req.body.id;
  
  //data = user's data
  const data = await userModel.findById(userId, function(error){
    if(error) {
      console.log('logs finById error: '+error);
      return next({message: 'logs findById error: '+error})
    }
  });

  //if data = null, then user doesnt exist
  if(!data) {
    return next({message: 'Cannot find userId'});
  };

  //create and attribute data values
  result.log= data.exercises;
  result._id = userId;
  result.username = data.username;
  result.count = data.exercises.length;

  //result.log will have to change adequatly
  //that means one of limit, from or to exists
  if(Object.keys(req.query).length > 0) {
    let {from, to, limit} = req.query;

    //let from
    from = new Date(from) == 'Invalid Date' ? 0 : new Date(from);
    //let to
    to = new Date(to) == 'Invalid Date' ? new Date() : new Date(to);
    //let limit
    limit = isNaN(parseInt(limit)) ? 0 : parseInt(limit);


    //filter expected result: from <= elem.date <= to
    result.log = result.log.filter(elem => {
      let elementDate = new Date(elem.date);

         if(elementDate >= from && elementDate <= to) return (elem)
       });
   
    //limit should be > 0 or nothing will be returned  
    if(limit > 0){
      result.log = result.log.slice(0, limit);
    }
    
  } 
  
  //console.log(result);
  res.json(result);

});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;
const User = mongoose.model('User');

const defaultUsers = [
  { username: 'steven', password: 'BlueWater82!', role: 'admin' },
  { username: 'dennis', password: 'BlueWater82!', role: 'admin' },
  { username: 'berko',  password: 'BlueWater82!', role: 'admin' },
  //{ username: 'leon',   password: 'BlueWater82!', role: 'admin' },
  { username: 'juna',   password: 'BlueWater82!', role: 'admin' },
  //{ username: 'victor', password: 'BlueWater82!', role: 'admin' }
];

// for (let user of defaultUsers)
//   User.create(user);

module.exports = {

  getUsers: (req, res) => {
    User.find({}, (err, docs) => {
      res.json({
        admin: req.session.role === 'admin',
        users: docs.map(d => d.username)
      });
    });
  },

  getUsersByPage: (req, res) => {
    if (req.session.role != 'admin')
      return res.status(403).send('Invalid request.');
    
    var page = req.query.page;
    var pagesize = req.query.pagesize;
    var params = { 
      page: parseInt(page), 
      limit: parseInt(pagesize),
      sort: 'role'
    };

    if (req.query.sort)
      params.sort = req.query.sort;
      
    /* // Search not needed yet
    var keyword = req.query.keyword;
    var query = helpers.formSearchQuery(keyword, 'username');
    */
    var query = {};
    User.paginate(query, params, (err, result) => {
      if(err) {
        console.error(err);
        return res.sendStatus(500);
      }

      let docs = result.docs || [];

      docs.map(d => {
        delete d.password
      })

      res.json({
        docs,
        total:  result.total  || 0,
        limit:  result.limit  || pagesize,
        page:   result.page   || 1,
        pages:  result.pages  || 0
      });
    });
  },

  getUser: (req, res) => {
    if (req.session.role != 'admin')
      return res.status(403).send('Invalid request.');

    var id = req.params.id;

    User.findById(id, function(err, user) {
      if (err) {
        console.error(err);
        return res.json({ id: false });
      }
      res.json({
        '_id': user._id,
        'username': user.username,
        'role': user.role,
      });
    });
  },

  deleteUser: (req, res) => {
    if (req.session.role != 'admin')
      return res.status(403).send('Invalid request.');
    
    if (!req.body._id)
      return res.status(400);

    User.findByIdAndRemove(req.body._id, err => {
      if (err) console.error(err); 

      res.json({
        result: !err
      });
    });
  },

  newOrUpdateUser: (req, res) => {
    if (req.session.role != 'admin')
      return res.status(403).send('Invalid request.');

    let { _id, username, password, role } = req.body;
    let doc = { username, role };

    if (!_id && !password)
      return res.status('400').send('New user must have a password')

    if (password) doc.password = password;

    User.findOneAndUpdate({
      _id: _id || ObjectID()
    }, {
      '$set': doc
    }, { 
      upsert: true
    }, (err, existing) => {
      if (!err) {
        res.json(doc);
      } else {
        console.error(err);
        res.json({ id: false });
      }

      let query = { 'owner': existing.username };
      let update = { '$set': { 'owner': username} };

      mongoose.model('Traffic-Link').update(query, update);
      mongoose.model('Traffic-Offer').update(query, update);
      mongoose.model('Link').update(query, update);

    });
  },

  loadDefaultUsers: (req, res) => { 
    if (req.session.role !== 'admin') 
      return res.status(403).send('Invalid request.');
    
    for (let user of defaultUsers)
      User.create(user);
    
    res.json({ result: true });
  }
}
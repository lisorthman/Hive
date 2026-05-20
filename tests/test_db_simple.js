process.stdout.write('Loading mongoose...\n');
const mongoose = require('mongoose');
process.stdout.write('Mongoose loaded. Connecting...\n');
const MONGO_URI = 'mongodb+srv://Scholarshare:scholarshare@cluster0.mmj1r.mongodb.net/Hive?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    process.stdout.write('Connected successfully!\n');
    process.exit(0);
  })
  .catch(err => {
    process.stdout.write('Connection failed: ' + err.message + '\n');
    process.exit(1);
  });

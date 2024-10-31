const express = require('express');
const app = express(); 
const routes = require('./Register_Authority');

app.use(express.json());

app.use('/', routes);

module.exports = app;

//El puerto utilizado es el 3000
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
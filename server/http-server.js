import express from 'express';

const assert = require('assert');
const os = require('os');
const fs = require('fs-extra');
const path = require('path')
const inspect = require('util').inspect;

const app = express();
WebApp.connectHandlers.use(app);
var device = require('express-device');
app.use(device.capture());
app.use(express.static('public'));


/************************
const x_handlebars  = require('./express-handlebars.js');
//const x_handlebars  = require('express-handlebars');
app.engine('xhbs', x_handlebars({
//  defaultLayout:'main',
  extname: 'hbs',
//  layoutsDir: 'views',
//  partialsDir: 'views',
}));
app.set('view engine', 'xhbs'); // module
app.set('views', '/home/dkz/views');
*****************/


/*
const hbs = require('hbs');
app.set('view engine','hbs'); // extension name
//app.set('view engine','html'); // extension name
app.engine('hbs', require('hbs').__express);
console.log(`@31 __dirname:<${__dirname}>`)
//app.set('views', __dirname + '/views');
//app.set('views', '/home/dkz/views');
app.set('views', '/home/dkz/2020/227-editora-v2/private/views');
//app.set('views', '../assets/app/views');
*/


app.get('/ping', (req, res)=>{
  if (req.device.type.toLowerCase() == 'phone') {}

  const html = `<body><pre>
    ping-pong
    device-type:${req.device.type.toLowerCase()}
    </pre></body>`;

  res.status(200)
  .end(html);
})

/*
app.get('/museum-api/s3-static/:id', require('./http-server/museum-api.js').s3_static)
app.get('/museum-api/s3-render/:id', require('./http-server/museum-api.js').s3_render)
app.get('/museum-api/s3-index', require('./http-server/museum-api.js').s3_index)
//app.get('/museum-api/index-auteurs', require('./http-server/museum-api.js').index_auteurs)
app.get('/museum-api/page/:xid', require('./http-server/museum-api.js').page)
//app.get('/museum-api/index-marques', require('./http-server/museum-api.js').index_marques)
app.get('/museum-api/handlebars-test', require('./http-server/museum-api.js').handlebars_test)
//app.get('/museum-api/index-constructeurs', require('./http-server/museum-api.js').index_constructeurs)
//app.get('/museum-api/index-titres', require('./http-server/museum-api.js').index_titres)
*/

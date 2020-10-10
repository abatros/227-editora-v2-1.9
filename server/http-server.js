import express from 'express';

const assert = require('assert');
const os = require('os');
const fs = require('fs-extra');
const path = require('path')
const yaml = require('js-yaml')
const inspect = require('util').inspect;

const app = express();
WebApp.connectHandlers.use(app);
var device = require('express-device');
app.use(device.capture());
app.use(express.static('public'));




app.get('/ping', (req, res)=>{
  if (req.device.type.toLowerCase() == 'phone') {}

  const html = `<body><pre>
    ping-pong
    device-type:${req.device.type.toLowerCase()}
    </pre></body>`;

  res.status(200)
  .end(html);
})

// -------------------------------------------------------------------------

const subsites = yaml.safeLoad(Assets.getText('subsite-instances.yaml'))
console.log(`@33 `,{subsites})

subsites.forEach(su =>{
  const {init_instance} = require(su.require);
  init_instance(su);
})

Meteor.startup(()=>{
  //console.log(`@42 app.routes:`,app._router.stack)  
})

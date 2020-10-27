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

//const zzz = require('/server/http-server/subsite')

// -------------------------------------------------------------------------

import * as StuffToImport from './http-server';
console.log(`StuffToImport:`,{StuffToImport})


Meteor.startup(async ()=>{
  //console.log(`@42 app.routes:`,app._router.stack)

  const subsites = yaml.safeLoad(Assets.getText('subsite-instances.yaml'))
  console.log(`@33 `,{subsites})

  if (false) {
    // https://docs.meteor.com/packages/dynamic-import.html
    // ABSOLUTE NEED TO PRE-REGISTER THE MODULES

    import ('/server/http-server/caltek')
    import ('/server/http-server/museum')
    import ('/server/http-server/subsite')
  }


  for (const su of subsites) {
    const moduleName = su.require;
    try {
      console.log(`@48 require <${moduleName}>`)
      const m_ = await require(moduleName);
      const {init_instance} = m_;
      if (!init_instance) {
        console.log(`@39 missing init_instance from <${su}>`)
      } else {
        init_instance(su);
      }
    }

    catch(err) {
      console.log(`@52 <${moduleName}> err:`, err)
    }
  } // each subsite



})

import { Meteor } from 'meteor/meteor';
const fs = require('fs-extra');
const path = require('path')
const assert = require('assert')

Meteor.startup(() => {
  // code to run on server at startup
  // console.log(`@11: `, www_root.init('/www'))
  require('./get-e3md.js').init('/www')
});

Meteor.onConnection((x)=>{
  console.log(`@11: onConnection `,x)
  console.log(`@11: onConnection.httpHeaders.host `,x.httpHeaders.host)
})

Meteor.methods({
  'get-e3data': async (cmd) =>{
    const {get_e3md} = require('./get-e3md.js')
    console.log(`@15: >> get-e3md:`,{cmd})
    return await get_e3md(cmd);
  }
});

Meteor.methods({
  'save-e3data': (cmd) =>{
    console.log(`@22: save-e3data cmd:`,cmd)
    const {host,pathname,xid,data,update} = cmd;
    assert(host);
    assert(pathname);
    assert(xid);
    assert(data)
    const {save_e3md} = require('./get-e3md.js')
    return save_e3md(cmd);
  }
});

Meteor.methods({
  'e3list': (cmd) =>{
    const {url} = cmd;
    assert(url);
    const {e3list} = require('./get-e3md.js')
    return e3list(cmd);
  }
});


Meteor.methods({
  'ping': ()=>{
    const conn = this.connection; // is it ready ? not sure.
    console.log(`@50: conn =>`,conn)
    return conn.id;
  }
})

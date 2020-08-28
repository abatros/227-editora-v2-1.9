import { Meteor } from 'meteor/meteor';

const fs = require('fs-extra');
const path = require('path')
const assert = require('assert')
const s3 = require('./lib/aws-s3.js')();

require('./lib/new-article.js')
require('./lib/get-s3object-method.js')
require('./lib/put-s3object-method.js')


Meteor.startup(() => {
  // code to run on server at startup
  // console.log(`@11: `, www_root.init('/www'))
  require('./get-e3md.js').init('/www');
//  console.log(`@12 Meteor.startup: `,{s3})
  console.log(`@13 Meteor.startup - ping ->`,s3.ping())
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


function select_hooks(s3fpath) {
  if (s3fpath.startsWith('s3://abatros/yellow')) {
    console.log(`@32 s3fpath:<${s3fpath}> switched to yellow-book hooks.`)
    return require('./lib/yellow-book.js')
  }

  // default to blueink
  console.log(`@32 s3fpath:<${s3fpath}> switched to blueink-hooks.`)
  return require('./get-e3md.js')
}

Meteor.methods({
  'save-e3data': (cmd) =>{
    console.log(`@39: save-e3data cmd:`,cmd)
    const {host,pathname,xid,data,update} = cmd;
    assert(host);
    assert(pathname);
    assert(xid);
    assert(data)

    /******************************************************
      ANALYSE s3fpath and select hooks
    *******************************************************/

    const {save_e3md} = select_hooks(cmd.s3fpath)
    return save_e3md(cmd);
  }
});

Meteor.methods({
  'commit-s3data': (cmd) =>{
    console.log(`@22: commit_s3data cmd:`,cmd)
    const {s3fpath, data, update} = cmd;
//    const {commit_s3data} = require('./get-e3md.js')
    const {commit_s3data} = select_hooks(cmd.s3fpath)
    return commit_s3data(cmd);
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

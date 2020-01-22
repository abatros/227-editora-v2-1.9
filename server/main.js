import { Meteor } from 'meteor/meteor';
const fs = require('fs-extra');
const path = require('path')
const assert = require('assert')

Meteor.startup(() => {
  // code to run on server at startup
});


Meteor.methods({
  'get-e3data': async (cmd) =>{
    const {get_e3md} = require('./get-e3md.js')
    const {ai,url} = cmd
    console.log(`>> get-e3md:`,{cmd})
    return await get_e3md(cmd);
  }
});

Meteor.methods({
  'save-e3data': (cmd) =>{
    const {url,ai,data,update} = cmd;
    assert(url);
    assert(ai);
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

import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';
import './edit-article/edit-article.js'
import './new-article/new-article.js'
import './a-directory/articles-directory.js'
import './admin-edit/admin-edit.js'

Template.registerHelper('session', function (varName) {
  return Session.get(varName);
});

/********************************

    WHAT FOR ?

*********************************/


const pulse = 300;
let cnt =0;

var interval = Meteor.setInterval(function () {
    cnt++;
    console.log(cnt,Meteor.default_connection._lastSessionId,Meteor.status())
  },pulse)

Tracker.autorun(function () {
  // lets watch Meteor.status().connected becoming true
  if (Meteor.status().connected) {
    // clear the interval
    Meteor.clearInterval(interval);
    // there will still be a few milliseconds while the connection process completes
    // so use anothet interval
    const readyInterval = Meteor.setTimeout(function () {
      if (Meteor.default_connection._lastSessionId) {
        Meteor.clearInterval(readyInterval);
        console.log('@34 session ready', Meteor.default_connection._lastSessionId);
        Session.set('session-id', Meteor.default_connection._lastSessionId)
        console.log(`@36 Meteor.default_connection:`, Meteor.default_connection)
      }
    },pulse)
  }
})

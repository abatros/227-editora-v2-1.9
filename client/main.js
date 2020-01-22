import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';
import './edit-article/edit-article.js'
import './a-directory/articles-directory.js'

Template.registerHelper('session', function (varName) {
  return Session.get(varName);
});

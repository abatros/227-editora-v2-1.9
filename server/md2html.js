const marked = require('marked');
const renderer = new marked.Renderer();
//const yaml = require('js-yaml');
const assert = require('assert')


function md2html(v2) {

  return marked(v2, { renderer: renderer });

}

module.exports = md2html;

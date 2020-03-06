const marked = require('marked');
const renderer = new marked.Renderer();
const yaml = require('js-yaml');
const assert = require('assert')


function fix_yaml(data) { // NO.
  const v = data.split(/\-\-\-/g);
  assert(!v[0])
  assert(v.length == 3)
  v[1] = v[1].replace(/^([^:]+):\s*/gm,'$1<<>>').replace(/:/g,'~!~').replace(/<<>>/g,': ')
//  console.log(v.join('---'))
  return v.join('---')
}

function md2html(data) {
  console.log(`@17: md2html data:`,data)
  data = fix_yaml(data);
  console.log(`@19: md2html data:`,data)
  const v = data.trim().split(/\-\-\-/g); //match(yamlBlockPattern);
  assert(!v[0])
  assert(v.length == 3)

  console.log(`@22: md2html `,v[1]);
  console.log(`@23: md2html `,v[2]);

  var json = yaml.safeLoad(v[1], 'utf8');


  //console.log({json})
  if (json.format == 'raw-html') {
    return {data:json, html:v[2]}
  }

  const html = marked(v[2], { renderer: renderer });

  return {data:json, html}

}

module.exports = md2html;

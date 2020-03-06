const marked = require('marked');
const renderer = new marked.Renderer();
const yaml = require('js-yaml');
const assert = require('assert')

renderer.heading_X = function (text, level) {
  //console.log(`renderer.heading h${level}:`,text)
  if (level == 3) {
    return `
    <h${level} style="display:inline-block;">${text}</h${level}>\n
    `;
  }

  return `
  \n\n\
  <h${level}>${text}</h${level}>\n
  `;
}

renderer.listitem = function (text, task, checked) {
  //console.log(`renderer.listitem task:${task} check::${checked} =>`,text)
  return `<li class="green">${text}</li>`;
}

renderer.del = function(code) {
  //console.log(`renderer::del ${code}`)
  return `<span class="bc10">${code}</span>`
}


function md2html(data) {
  const v = data.trim().split(/\-\-\-/g); //match(yamlBlockPattern);
  assert(!v[0])
  assert(v.length == 3)

  //console.log(v[1]);
  //console.log(v[2]);

  var json = yaml.safeLoad(v[1], 'utf8');

  //console.log({json})
  if (json.format == 'raw-html') {
    return {data:json, html:v[2]}
  }

  const pre = marked(v[2], { renderer: renderer });



const post = `
<vbox>
<a href="${json.html}" target="_blank">See more of this products</a>

<hbox class="gp-pdf1 center-items">
Download PDF &ensp;
<a href="${json.pdf1}" target="_blank">
<img src="http://www.ultimheat.com/blueink/JPG/pdf_logo.jpg" width="25"/></a>
</hbox>

<a href="${json.catalog}" target="_blank">
Access full catalogue
</a>
</vbox>
`;


return {
  html: `
    <vbox class="green-product">
    <hbox class="gp-top">
      <img src="${json.img}" alt="">
    </hbox>
    <h1 class="gp-sku">type: ${json.sku}</h1>
    ${pre}
    ${post}
    </vbox>`,
  data:json
  };

}

module.exports = md2html;

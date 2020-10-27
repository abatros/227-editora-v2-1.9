#! /usr/bin/env node

const fs = require('fs')
const assert = require('assert')

const marked = require('marked');

const renderer = new marked.Renderer();

renderer.heading = function(text,level,raw,slugger) {
    return `\n\n\\bgroup
\\${'h'.repeat(level)} ${text}\n\\egroup%${'h'.repeat(level)}
`
  }

renderer.code = function(code, infosreading, escaped) {
//  throw 'break@17'
  return `\n\\bgroup\\pre\n\\pre${infosreading}\\escaped:{${escaped}}\n${code}}\n\\egroup%pre\n`;
}

renderer.blockquote = function(quote) {
  return `\n\\bgroup\\blockquote\n${quote}\n\\egroup%blockquote\n`;
}

renderer.html = function(html) {
  throw 'break@25'
}

renderer.hr = function(html) {
  throw 'break@29'
}

renderer.list = function(body, ordered, start) {
  console.log(`@33 `,{body},{ordered},{start});
  return `\n\\bgroup\\list ${body} \n\\egroup%list\n`;
}

renderer.listitem = function(text, task, checked) {
  return `\n\\li\n\\task${task}\\checked${checked}\n${text}`
}

renderer.checkbox = function(checked) {
//  throw 'break@41'
  return `\\checkbox${checked} `
}

renderer.paragraph = function(text) {
  return `\n\\par ${text}\n\\par\n`
}

renderer.table = function(header,body) {
  throw 'break@49'
}

renderer.tablerow = function(content) {
  throw 'break@53'
}

renderer.tablecell = function(content,flags) {
  throw 'break@57'
}

renderer.string = function(text) {
  throw 'break@61'
}

renderer.em = function(text) {
  return `{\\it ${text}}`
}

renderer.strong = function(text) {
  return `{\\bf ${text}}`
}


renderer.codespan = function(code) {
  return `{\\codespan ${code}}`
}

renderer.del = function(text) {
  return `{\\strike ${text}}`
}

renderer.link = function(href,title,text) {
  console.log(`@77 link href:<${href}>
    title:<${title}>
    text:<${text}>`)
  return ''
}

renderer.image = function(href,title,text) {
  console.log(`@81 image src:<${href}>
    title:<${title}>
    text:<${text}>`)
  return ''
}

renderer.text = function(text) {
//  console.log(`@85 `,{text})
//  throw 'break85'
  return text;
}




//marked.use({renderer});

const test1 = `

[r2h]: http://github.com/github/markup/tree/master/lib/github/commands/rest2html
[r2hc]: http://github.com/github/markup/tree/master/lib/github/markups.rb#L13



# title one.
Voici du texte.
## Sub title.
text for substitle
[caption](http:ultimheat.com "title-here")
[caption2
  on two lines
](http:ultimheat.com2 "title-here
on two
or more lines"


paragraph1

paragraph2


### A list:

- item1
- item2
- item3
- item4


- [ ] item1
- [x] item2
- [ ] item3
- [x] item4

~~~ javascript gives type of formatting we want to apply
some verbatim code
Somewhere, something incredible is waiting to be known
Could be used to extract data,
or apply special formatting accorfing to info/lang
~~~


> some verbatim code
Somewhere, something incredible is waiting to be known

![an image](http://ultimheat.com/img1 "caption here")


> ###  Headers break on their own
> Note that headers don't need line continuation characters
as they are block elements and automatically break. Only text
lines require the double spaces for single line breaks.


Structured statements like \`for x =1 to 10\` loop structures
can be codified using single back ticks.


\`\`\`csharp
// this code will be syntax highlighted
for(var i=0; i++; i < 10)
{
    Console.WriteLine(i);
}
\`\`\`


\`\` \`tex
this is tex code
\`\` \`


hello ~Dolly~


~~~ txt
1
2
3
~~~

This is _italic_ and __bold__.


[Another way to linnk][r2h]




[Another way to linnk!!!!][r2h]


`

console.log(marked(test1, { renderer}));

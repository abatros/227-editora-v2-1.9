#! /usr/bin/env node

const fs = require('fs')
const assert = require('assert')
const yaml = require('js-yaml')
const { Readable } = require("stream")
const {spawn} = require('child_process')

const s3 = require('../server/lib/aws-s3.js')();
const {parse_s3filename, extract_metadata} = require('../shared/utils.js')
const util = require('util')
const stream = require('stream')


const md_fname = 's3://caltek/books/101-dont-go-where/112-chapter-12.md'
const {Bucket, Key} = parse_s3filename(md_fname)

main();

async function main() {
  const {data:stylesheet, LastModified} = await s3.getObject('s3://caltek/books/101-dont-go-where/style-sheet.tex')
  if (!LastModified) throw 'fatal@19'

  const tex = await get_tex(md_fname)

  console.log(tex)

/*
  const s1 = s3.__s3client.getObject({
    Bucket: 'caltek',
    Key: 'books/101-dont-go-where/style-sheet.tex'
  }).createReadStream();

  const s2 = s3.__s3client.getObject({
    Bucket: 'caltek',
    Key: 'books/101-dont-go-where/102-chapter-2.md'
  }).createReadStream();
*/


  const s = new Readable();
  s.push(stylesheet)
  s.push(tex)
  s.push('\\bye\\end ')
  s.push(null)


  const pdftex = spawn('pdftex',['-output-directory=.','-jobname=xyz', '\\relax '])

  pdftex.stdout.on('data', (data) => {
    console.log(`@18 stdout: ${data}`);
  });

  pdftex.stderr.on('data', (data) => {
    console.error(`@22 stderr: ${data}`);
  });

  pdftex.on('close', async (code) => {
    console.log(`@26 child process exited with code ${code}`);
    // stream from xyz.pdf to s3://caltek
    await move_pdf(md_fname.replace(/.md$/,'.pdf'));
  });



//  s1.pipe(pdftex.stdin, {end:false})
//  s2.pipe(pdftex.stdin, {end:false})
  s.pipe(pdftex.stdin)
}


// -------------------------------------------------------------------------

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
  console.log(`@25 IGNORE html:`,html)
  // ignore <iframe>
  return '';
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



async function get_tex(s3fn) {
  const {data, LastModified} = await s3.getObject(s3fn)
  if (!LastModified) throw 'fatal@19'

  const {meta,md} = extract_metadata(data)

  const tex = marked(md, {renderer});
  return tex
    .replace(/\&\#39\;/g,"'")
    .replace(/\&quot\;/g,'"')
    .replace(/\&mdash\;/g,'--')
    .replace(/\&\#(\d+)\;/g,'\\cc{$1}')
    ;
}


async function uploadReadableStream(stream) {
  const params = {
    Bucket,
    Key: Key.replace(/.md$/,'.pdf'),
    Body: stream,
    ACL: 'public-read',
    ContentType: 'application/pdf'
  };
  return s3.__s3client.upload(params).promise();
}

async function move_pdf(s3fn) {
  const s = fs.createReadStream('xyz.pdf');
  await uploadReadableStream(s);
  console.log('@198 copy done.')
}

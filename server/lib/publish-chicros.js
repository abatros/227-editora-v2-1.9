const path = require('path')
const assert = require('assert')
const yaml = require('js-yaml')
const s3 = require('./aws-s3.js')();
const cheerio = require('cheerio')

const {parse_s3filename, extract_metadata} = require('/shared/utils.js')
const utils = require('./utils.js')
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')

module.exports = publish_chicros;

async function publish_chicros(s3fn, meta, md) {
  const verbose =1;

  assert (meta.doctype == 'chicros');
  assert (typeof s3fn == 'string')

  // md can be pure html or MD-code.
  // lets assume pure html. => no need for renderer

  /***************************************************

    in 'chicros' mode the html is at the same level in (index.html)
    there is a (master.html) also at the same level

    ex:
        s3://abatros/chicros/103-shopping-cart.md
        s3://abatros/chicros/master.html
    =>  s3://abatros/chicros/index.html


  ****************************************************/

  const {Bucket, Key:Key_} = parse_s3filename(s3fn)
  const {dir, name:eId, base, ext} = path.parse(Key_)
  const Key = path.join(dir, 'master.html'); // one way. check

  const retv1 = await s3.getObject({Bucket,Key})

  const {ETag, VersionId} = retv1;
  let {data:html} = retv1;
  ;(verbose >0) && console.log(`@343 <${Bucket}><${Key}> eId:<${eId}>`, {ETag, VersionId});

  if (!ETag || !html) {
    const error = `@384 <${Bucket}><${Key}> Master file-not-found`
    console.error(error);
    throw error; // or return error...
  }


//throw 'break@53'

  /***************************************************

    cheerio-scan and build index of all div.js-e3element
    (optional)

  ****************************************************/

  const $ = cheerio.load(html);

  if (true) {
    const v = $('div.js-e3element');
    v.each((j,it) =>{
      console.log(`@367 `,it.attribs)
    })

  }

//throw 'break@72'

  /***************************************************

    cheerio-scan and locate the component.

  ****************************************************/

  //console.log(`@80 `,$('div#103-shopping-cart'));

//  const a = $('body').find(`#${ai}`)
//  const selector = `div#${eId}`;
  const selector = `#${eId}`;
//  const selector = 'div#103-shopping-cart';

  const v = $(selector); // only 1 article should have that ID...
  console.log(`@363: locate e3element eId:<${eId}> (${v.length})`)
  if (v && v.length > 1) {
    console.log('@437:',v)
    throw `eId:${eId} multiple (${v.length}) hits in <${s3fn}>`
  }
  if (!v || v.length != 1) {
    throw `eId:<${eId}> not found in <${Key}> selector:<${selector}>`
  }
//  const tagName = v[0].name;
//  console.log({tagName})

//  return {tagName, html: ($(v[0]).html() || '').replace(/^[\s]*/gm,'')};

//throw 'break@98';

  /***************************************************

    cheerio empty and replace the component.

  ****************************************************/


//  $(v[0]).remove();
  $(v[0]).empty();
  $(v[0]).append(md);

  //console.log($.html())

  /***************************************************

    write the page back to s3://bucket/.../index.html

  ****************************************************/

  html = $.html();

  if (true) {
    const Key = path.join(dir,'index.html');
    const params = {
      Bucket,
      Key,
      ACL: 'public-read',
      ContentType: 'text/html',
      ContentEncoding : 'utf8',
    };

    params.Body = html

    const retv2 = await s3.putObject(params)
    console.log(`@409 <${Bucket}><${Key}> (${html.length})`,{retv2})
    return retv2;

  }


} // publish-chicros

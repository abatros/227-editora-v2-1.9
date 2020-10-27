import path from 'path';
import yaml from 'js-yaml';
import assert from 'assert';
import {parse_s3filename} from '/shared/utils.js'

import { WebApp } from 'meteor/webapp';
//WebApp.connectHandlers.use('/caltek/index-pages', index_pages);

import {extract_metadata} from '/shared/utils.js'
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')
const {list_pages, get_instance} = require('./index.js')
//const {get_instance} =
//require('./init-instance.js')


const verbose =0;

const s3 = require('/server/lib/aws-s3.js')();

module.exports = toc;

async function toc(req, res, next) {
  const verbose =1;
  const audit =[];
  const etime_ = new Date().getTime();
  let {originalUrl, url, headers} = req;

  if (originalUrl.endsWith('/')) originalUrl = originalUrl.slice(0,-1)

  console.log(`@28 [${module.id}] originalUrl: <${originalUrl}> url:<${url}>`)

  if (url && (url.length>1)) { // ignore "/"
    // we should not be here
    ;(verbose >0) && console.log(`@35 NEXT url:<${url}> <${originalUrl}>`,{next})
    next(); // will pick the next-one /caltek/books/....
    return;
  }

  const subsite = get_instance(originalUrl);

  if (!subsite) {
    //console.log(`@21 toc`, {req}) // headers, url (after)

    const msg = `@33 [${module.id}] FAILED.
    toc-handler
    subsite instance <${originalUrl}> not-found
    original Url <${originalUrl}>
    url <${url}>
    `;
    console.error(msg)
    res.status(200).end(msg);
    return;
  }

  const {package, s3dir} = subsite; // package-instance

  /********************************************************************




  *********************************************************************/


  console.log(`@25 `,{subsite})
//  const s3dir = originalUrl; // !!!! not exactly true....
  const s3fn = 's3:/'+path.join(s3dir,'index-pages.json');
  ;(verbose >0) && console.log(`@68 s3fn:`,{s3fn})
  const retv1 = await s3.getObjectMetadata(s3fn)
  if (audit) audit.push({etime:new Date().getTime()-etime_, label:`getObjectMetadata(index-pages.json)`})
  ;(verbose >0) && console.log(`@678 [${module.id}] metadata`,{retv1})


  if (!retv1.ETag) {
    let {pages, error, Bucket, Key} = await list_md_files('s3:/'+s3dir) // not correct...
    ;(verbose >0) && console.log(`@389 [${module.id}] found ${pages.length} pages.`)
    audit.push(`${new Date().getTime()-etime_} list-pages (${pages.length})`)

    await s3.putObject(s3fn, JSON.stringify(pages, null, ' '))
  }



  const template_fn = `views/subsite/toc-json.html`
  const template_html = Assets.getText(`views/subsite/toc-json.html`)
  const templateName = `subsite-toc-json`;

  const compiled = SSR.compileTemplate(templateName, template_html);

  // add Bucket for json data file
  // this come from package-instance

  const {Bucket, Key} = parse_s3filename(s3fn, {verbose:0})

  Object.assign(subsite, {
    Bucket,
    Key,
  })

  const html_ = SSR.render(templateName, subsite);

//  console.log({html_})

  const script = Assets.getText(`views/subsite/toc-json.handlebars`)

  const html = html_.replace('</body>', '</body>\n\n'+script); // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  res.status(200).end(html)
  audit.push({etime:new Date().getTime()-etime_, label:`sending`})

return;
  res.status(200).end(`
    this is TOC from caltek <${req.originalUrl}>
    ${JSON.stringify(subsite,null,1)}
    `)
}



async function list_md_files(s3dir) {
  const {Bucket,Key} = parse_s3filename(s3dir)
  console.log(`@77 `,{Bucket},{Key},{s3dir})
  const retv2 = await s3.readdir_nofix({Bucket, Prefix:Key});
  ;(verbose >0) && console.log(`@125 found ${retv2.Keys.length} Keys`)

  const k = Key.length;
  const pages = retv2.Keys
      .filter(it => (it.endsWith('md')))
      .map(it => it.substring(k+1)); // maybe path.parse here


  console.log(`@80 listing:`,pages);
  return {pages,Bucket,Key}
}

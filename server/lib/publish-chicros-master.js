const path = require('path')
const assert = require('assert')
const yaml = require('js-yaml')
const s3 = require('./aws-s3.js')();
const cheerio = require('cheerio')

const {parse_s3filename, extract_metadata} = require('/shared/utils.js')
const utils = require('./utils.js')
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')

module.exports = publish_chicros_master;

async function publish_chicros_master(s3fn) {
  const verbose =1;

  assert (typeof s3fn == 'string')


  /***************************************************

    in 'chicros' mode the html is at the same level in (index.html)
    there is a (master.html) also at the same level

    ex:
        s3://abatros/chicros/103-shopping-cart.md
        s3://abatros/chicros/master.html
    =>  s3://abatros/chicros/index.html


  ****************************************************/

  const {Bucket, Key} = parse_s3filename(s3fn)
  const {dir, name, base, ext} = path.parse(Key)
  assert(ext == '.html');

  const retv1 = await s3.getObject({Bucket,Key})

  const {ETag, VersionId} = retv1;
  let {data:html} = retv1;
  ;(verbose >0) && console.log(`@343 <${Bucket}><${Key}>`, {ETag, VersionId});

  if (!ETag || !html) {
    const error = `@384 <${Bucket}><${Key}> Master file-not-found`
    console.error(error);
    throw error; // or return error...
  }


//throw 'break@53'

  /***************************************************

    cheerio-scan and build index of all div.js-e3element

  ****************************************************/



  const $ = cheerio.load(html);

  const e3elements =[];
  const v2 = $('.js-e3element');
  v2.each((j,it) =>{
    console.log(`@367 `,it.attribs)
    e3elements.push(it)
  })

  for (it of e3elements) {
    await replace_innerHtml(it)
  }

/*******************************************************************

    just copy md (supposed to be pure html)
    and (IF) metadata.dataset => create a <script> with dataset

********************************************************************/


  async function replace_innerHtml(it) {
    const eId = it.attribs.id;
    assert(eId)
    console.log(`@72 replace e3element <${eId}>`,)

    const retv1 =  await s3.getObject({Bucket, Key: path.join(dir, eId+'.md')})
    if (retv1.error) throw retv1.error;

    const {meta, md:innerHtml} = extract_metadata(retv1.data)

    const script = await create_dataset_script(meta)

    let innerHtml_ = script || '';
    innerHtml_ += innerHtml;

    assert (innerHtml_.length >0);

    $(it).empty()
    $(it).append(innerHtml_)
  }


  /*******************************************************************

  Each item in the dataset.list is either
  (1) an image link (or)
  (2) a md-object containing metadata about the gallery item.

  object ext decides which one.

    cannot be both.

  ********************************************************************/


async function create_dataset_script(meta) {
    const dataset = meta.dataset;
    if (!dataset) return;

    console.log(`@104 create_dataset_script `,{dataset})
    console.log(`@104 create_dataset_script list: `,dataset.list)

    /************************************

    each item in the list is either: {img,title,....}  :: direct
    (or) {fn:xxxx.md} :: indirect
    *************************************/

    const list =[];

    for (it of dataset.list) {
      console.log(`@132 `,{it})
      const {fn} = it; // prime
      if (fn) {
        const s3fn = path.join(dataset.root, fn)
        it = await get_meta_from(s3fn);
      }

      console.log(`@136 it:`,it)
      //return it;
      list.push(it)
    }

    console.log(`@137 `,{list})

    const script =`
    <script>
    var ${dataset.name} = {
      root: '${dataset.root}',
      list: [
        ${list.map(it=>(`{img: '${it.img}'}`)).join(',\n')}
      ],
    }
    </script>
    `;

    console.log(`@138 `,{script})

  return script
  }


async function get_meta_from(s3fn) {
    console.log(`@153 get_meta_from <${s3fn}>`)
    const retv = await s3.getObject(s3fn)
    const {meta, md} = extract_metadata(retv.data);
    /**********
    we could run a MD-renderer to extract more metadata....
    ***********/

    console.log(`@153 get_meta_from <${s3fn}> meta:`,meta)
    return meta;
  }


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
    console.log(`@112 <${Bucket}><${Key}> (${html.length})`,{retv2})
    return retv2;
  }


} // publish-chicros-master

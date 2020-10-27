import './right-panel-deep-search.html'
import assert from 'assert';
import utils from '/shared/utils.js'
import path from 'path';
import uparse from 'url-parse';
import yaml from 'js-yaml';
import {parse_s3filename} from '/shared/utils.js'

const verbose =0;
const TP = Template.right_panel_deep_search;

//const listing = new ReactiveArray();
let listing = null;
const timeStamp = new ReactiveVar(null);

const config_cache ={};

function get_publish_cfg(workspace) {
  const yaml_fn = path.join(workspace,'.publish.yaml')
  if (config_cache.yaml_fn == yaml_fn) {
    return config_cache.cfg;
  }

  ;(verbose >0) && console.log(`@21 UPDATING CACHE FOR <${yaml_fn}>`)
  return new Promise((resolve,reject)=>{
    Meteor.call('get-s3object',yaml_fn,(err,data)=>{
      if (err) {
        console.error(`Unable to get <${yaml_fn}> err:`,err);
        throw err;
      }
      console.log('@17 ',{data})
      const cfg = yaml.safeLoad(data.data)
      console.log('@18 ',{cfg})
      const {path} = cfg;
      console.log('@19 ',{path})
      config_cache.yaml_fn = yaml_fn;
      config_cache.cfg = cfg;
      resolve(config_cache.cfg)
    }) // call
  }) // Promise
} // get-publish-cfg


TP.onCreated(function(){
  ;(verbose >=0) && console.log(`> onCreated right-panel-deep-search`)
})

TP.onRendered(function(){
  const tp = this;
  ;(verbose >=0) && console.log(`> onRendered right-panel-deep-search`)
  const input = tp.find('input');
  input.value = ''
})

TP.events({
  'keyup input': (e,tp)=>{
    ///console.log(`@8 keyCode: (${e.keyCode})`)
    if (e.key == 'Enter') { // (e.keyCode == 13)
     ;(verbose >0) && console.log(`Do something with (${e.target.value})`);
     let s3prefix = e.target.value;

     deep_search(tp, s3prefix);
    }
    return false;
  },
  /*
  'click .directory-item': (e,tp)=>{

    const fname = e.target.attributes.data.value;
    console.log(tp.s3dir,{fname})
    const s3fn = path.join(tp.s3dir,fname,'index.md')
    console.log({s3fn})
    Session.set('s3-url',s3fn)
//    update_left_panel(s3fn)
}, */
  'submit form.js-search': async (e,tp)=>{
    e.preventDefault()
    ;(verbose >0) && console.log(`@44 click `,{e})
    ;(verbose >0) && console.log(`@45 click `,e.target) // div.directory-item
    const target = event.target;

    let query = target.query.value;
    let vpath = Session.get('search-path');

    const v = query.match(/^(.*)\s+path:([^\s]*)$/)
    if (v) {
      query = v[1];
      vpath = v[2];
    }
    ;(verbose >0) && console.log({v})

    if (!vpath) {
      vpath = await get_vpath_from_config();
      Session.set('search-path', vpath)
    }

    assert(query)
    assert(vpath)
    deep_search(tp, vpath, query)
  },

  /******************************************************************

    Visit article

  *******************************************************************/

  'submit form.js-item': (e,tp)=>{
    const verbose =0;
    e.preventDefault()
//    console.log(`@57 submit `,{e})
//    console.log(`@58 submit target: `,e.target) // div.directory-item
//    console.log(`@58 original-event: `,e.originalEvent.submitter.name)
    const opCode = e.originalEvent.submitter.name;
    const name = e.currentTarget.attributes.name;
    const iSeq = e.currentTarget.attributes.data.value;
    if (name) {
      ;(verbose >0) && console.log(`@59 (${opCode}): `,name.value)
      switch(opCode) {
        case 'edit': break;
        case 'preview': break;
      }

      /* wrong
//      const s3_url = Session.get('s3-url');
      const {Bucket, subsite, xid, fn} = utils.extract_subsite(s3_url)
      console.log(`@72 `,{Bucket},{subsite},{xid},{fn})
      */


      ;(verbose >0) && console.log(`@77 select article[${iSeq}]:`,listing[iSeq])
      const item = listing[iSeq];
      const url = item.data.url;
      const s3_url = item.data.s3fn;
      if (!s3_url) {
        console.log(`@122 select article[${iSeq}]:`,item)
        throw 'missing s3_url'
      }

      //console.log(`@146 session.s3-url := <${s3_url}>`)
      validate_s3fn(s3_url)
      Session.set('s3-url',s3_url);
      Session.set('panel','showing-edit-panel')
      /*

      */
//      const s3fn = path.join(tp.s3dir, name.value, 'index.md')
//      Session.set('s3-url', 's3://'+s3fn) // will change reactively the content.
    } // name
  },
})

function validate_s3fn(s3fn) {
  const {Bucket,Key,subsite,xid,base,ext} = parse_s3filename(s3fn)
  if (!Bucket || !Key) {
    console.trace('@161')
    throw 'fatal@161'
  }
  ;(verbose >0) && console.log(`validate(${s3fn}) => <${Bucket}><${Key}> subsite:<${subsite} xid:<${xid}> base:<${base}>`)
  return s3fn;
}


TP.helpers({
  items: ()=>{
    const x = timeStamp.get();
    return listing; // an array of pages.
//    return listing && listing.list(); // reactive
  }
})

// ------------------------------------------------------------------------

async function get_vpath_from_config() {
  const verbose =0;
  let workspace = Session.get('workspace')
  if (!workspace) {
    const s3fn = Session.get('s3-url');
    const {Bucket,Key,subsite} = parse_s3filename(s3fn)
    workspace = path.join(Bucket,subsite);
  }
  ;(verbose >0) && console.log(`@52 workspace:`, workspace)
  const cache_ = await get_publish_cfg(workspace);
  const {path:vpath} = cache_;
  if (!vpath) {
    console.error(`@176 Missing path in <${workspace}> `,{cache_})
    throw 'fatal@176';
  }

  ;(verbose >0) && console.log(`@53 vpath:`, vpath)
  return vpath;
}

// ------------------------------------------------------------------------

function deep_search (tp, vpath, query) {
  const verbose =0;
//  tp.max_results_reached.classList.add('nodisplay')
  //    tp.execute_query(query);
  assert(vpath)
  assert(query)
  Meteor.call('deep-search',{path:vpath, query}, (err,data)=>{
    //tp.etime.set(new Date().getTime() - etime);
    if (err) {
      console.log(`ERROR Meteor.call(deep-search)
      query:"${query}"
      `, err);
//        tp.q.set('q4::Syntax or System Error! retype your query.') // system or syntax error
      return;
    }

    if (!data) {
//        tp.q.set('q3::No result for this query BAD!.');
      console.log(`NO DATA for this.`);
      return
    }

    // const v = query_History.push({query:_query, pages:data.hlist.length});
    /*
    if (_query.trim().indexOf(' ')<0) {
      console.log(`Single Word Mode (${_query}). Sorting...`)
      // single word search: check if word found in headline
      // sort if (flag,url, pageno)
      data.hlist.forEach(it => {
        it.sflag = (it.h1.toLowerCase().indexOf(_query.toLowerCase())<0) ? 1:0
        //if (it.sflag == 0) console.log(`(${it.sflag}) ${it.h1}`);
      })
      data.hlist = data.hlist.sort((a,b)=>{
        if (a.sflag != b.sflag) return a.sflag - b.sflag;
        if (a.url != b.url) return (a.url.localeCompare(b.url));
        return (a.pageno - b.pageno)
      });
    }

    tp.hlist.set(data.hlist);
    tp.q.set(`q3:: .`)
    tp.audit.set(data.audit);
    */

    const {pages, audit, etime} = data;
    ;(verbose >0) && console.log(`found ${pages.length} pages data:`,data)
    console.log(`deep-search found ${pages.length}`)
    listing = data.pages; // or pages.set(..)
    timeStamp.set(new Date().getTime())
    // limit to 100 results

    // tp.busy_flag.classList.add('hidden')

  }); // call deep-search
} // function dee_search


// =========================================================================


FlowRouter.route('/deep-search', { name: 'deep-search',
  triggerEnter: [
    function(context, redirect) {}
  ],
  action: function(params, queryParams){
    const verbose =1;
    console.log('Router::action for: ', FlowRouter.getRouteName());
    ;(verbose >0) && console.log(' --- params:',params);
    document.title = "deep-search";
    ;(verbose >0) && console.log(`@210: host:`,location.host)
    const {host} = location;
    ;(verbose >0) && console.log(`render data:`,Object.assign(params,queryParams))

    console.log(`@595 leaving router (deep-search) :`,queryParams)
    Session.set('panel','deep-search-panel')
    BlazeLayout.render('edit_article');
  }
});

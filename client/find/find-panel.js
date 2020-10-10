const fs = require('fs')
const path = require('path')
const assert = require('assert');
const yaml = require('js-yaml')

import {parse_s3filename, extract_metadata} from '/shared/utils.js'
import './find-panel.html'

import utils from '/shared/utils.js'

const verbose =1;
let listing = null;
const timeStamp = new ReactiveVar(null);

const TP = Template.find_panel;

// ---------------------------------------------------------------------------

TP.events ({
  'submit form.js-find': async (e,tp)=>{
    const verbose =1;
    e.preventDefault()
    ;(verbose >0) && console.log(`@44 click `,{e})
    ;(verbose >0) && console.log(`@45 click `,e.target) // div.directory-item
    const target = event.target;

    let query = target.query.value;
    let ltree = Session.get('search-path'); // ltree

    const v = query.match(/^(.*)\s+path:([^\s]*)$/)
    if (v) {
      query = v[1];
      ltree = v[2];
    }
    ;(verbose >0) && console.log({v})

    if (!ltree) {
//      vpath = await get_vpath_from_config();
      const p = Session.get('user-profile')
      const path1 = (Array.isArray(p.path))?p.path[0]:p.path;
      Session.set('search-path', path1) // first allowed path
    }

    Session.set('search-path', ltree) // first allowed path
    assert(query)
    Session.set('ltree-query',query);

    assert(ltree)
    find_files(tp, ltree, query)
  },

})



function find_files (tp, vpath, query) {
  const verbose =0;
//  tp.max_results_reached.classList.add('nodisplay')
  //    tp.execute_query(query);
  assert(vpath)
  assert(query != undefined)
  Meteor.call('find-files',{path:vpath, query}, (err,data)=>{
    //tp.etime.set(new Date().getTime() - etime);
    if (err) {
      console.error(`ERROR Meteor.call(find-file)
      query:"${query}"
      `, err);
//        tp.q.set('q4::Syntax or System Error! retype your query.') // system or syntax error
      return;
    }

    if (!data) {
//        tp.q.set('q3::No result for this query BAD!.');
      console.error(`NO DATA for this.`);
      return
    }


    if (data.error) {
//        tp.q.set('q3::No result for this query BAD!.');
      console.error({data});
      return
    }

    console.log({data})

    const {list=[], ltree, audit, etime} = data;
    //;(verbose >0) && console.log(`found ${pages.length} items:`,list)
    console.log(`find-files found ${list.length}`)
    console.log(`find-files found ${list.length}`,{list})
    console.log({ltree})

    listing = [];
    for (const it of list) {
      listing.push({path:it.path, o:it})
    }
    for (const vpath of ltree) {
      listing.push({path:vpath})
    }

    console.log({listing})

    listing.sort((a,b)=>{
      const r1 = a.path.localeCompare(b.path)
      if (r1 != 0) return r1;
      if (a.o && b.o) {
        return a.o.xid.localeCompare(b.o.xid)
      }
    })

    timeStamp.set(new Date().getTime())
    // limit to 100 results
    console.log({data:listing})
    // tp.busy_flag.classList.add('hidden')

  }); // call find-files
} // function find.

// ---------------------------------------------------------------------------

TP.helpers({
  items: ()=>{
    const x = timeStamp.get();
    if (!listing) return [];
    return listing; // an array of pages.
//    return listing && listing.list(); // reactive
  }
})

TP.events({
  'click button.js-subpath': (e,tp)=>{
    e.preventDefault();
    const subpath = e.target.attributes.data.value;
    console.log(`subpath:`, subpath)
    Session.set('search-path',subpath)
//    find_files(tp, subpath, '') // only dir
    find_files(tp, subpath, Session.get('ltree-query'))
  }
})

TP.events({
  'click .js-path-up': (e,tp) =>{
    let ltree =  Session.get('search-path');
    assert(ltree);
    const v = ltree.split('.'); v.length = v.length-1;
    const subpath = v.join('.')
    Session.set('search-path', subpath);
//    find_files(tp, subpath, '') // only dir
    find_files(tp, subpath, Session.get('ltree-query'))
  },

})


// ---------------------------------------------------------------------------
FlowRouter.route('/find', { name: 'find',
  triggerEnter: [
    function(context, redirect) {}
  ],
  action: function(params, queryParams){
    const verbose =1;
    console.log('Router::action for: ', FlowRouter.getRouteName());
    ;(verbose >0) && console.log(' --- params:',params);
    document.title = "find";
    ;(verbose >0) && console.log(`@210: host:`,location.host)
    const {host} = location;
    ;(verbose >0) && console.log(`render data:`,Object.assign(params,queryParams))

    console.log(`@595 leaving router (find) :`,queryParams)
    Session.set('panel','find-panel')
    BlazeLayout.render('edit_article');
  }
});

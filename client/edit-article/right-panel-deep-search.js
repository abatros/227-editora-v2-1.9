import './right-panel-deep-search.html'
import utils from '/shared/utils.js'
import path from 'path';
import uparse from 'url-parse';

const TP = Template.right_panel_deep_search;

//const listing = new ReactiveArray();
let listing = null;
const timeStamp = new ReactiveVar(null);

TP.onCreated(function(){
  console.log(`> onCreated right-panel-deep-search`)
})

TP.onRendered(function(){
  const tp = this;
  console.log(`> onRendered right-panel-deep-search`)
  const input = tp.find('input');
  input.value = ''
})

TP.events({
  'keyup input': (e,tp)=>{
    ///console.log(`@8 keyCode: (${e.keyCode})`)
    if (e.key == 'Enter') { // (e.keyCode == 13)
     console.log(`Do something with (${e.target.value})`);
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
  'submit form.js-lookup': (e,tp)=>{
    e.preventDefault()
    console.log(`@44 click `,{e})
    console.log(`@45 click `,e.target) // div.directory-item
    const target = event.target;
    const query = target.query.value;
//    tp.s3dir = target.dirName.value; // could be reactive...
    console.log(`@46 query:${query}`) // div.directory-item
    const vpath = 'dkz.projects'
    deep_search(tp, vpath, query)
  },
  'submit form.js-item': (e,tp)=>{
    e.preventDefault()
//    console.log(`@57 submit `,{e})
//    console.log(`@58 submit target: `,e.target) // div.directory-item
//    console.log(`@58 original-event: `,e.originalEvent.submitter.name)
    const opCode = e.originalEvent.submitter.name;
    const name = e.currentTarget.attributes.name;
    const iSeq = e.currentTarget.attributes.data.value;
    if (name) {
      console.log(`@59 (${opCode}): `,name.value)
      switch(opCode) {
        case 'edit': break;
        case 'preview': break;
      }

      /* wrong
      const s3_url = Session.get('s3-url');
      const {Bucket, subsite, xid, fn} = utils.extract_subsite(s3_url)
      console.log(`@72 `,{Bucket},{subsite},{xid},{fn})
      */


      console.log(`@77 listing[${iSeq}]:`,listing[iSeq])
      const item = listing[iSeq];
      const url = item.data.url;


      const s3_url = reverse_url(url)

      function reverse_url(url) {
        // should read data from NGINX
        // or include Bucket name in web-page
        let Bucket;
        const {hostname, pathname} = uparse(url);
        switch(hostname) {
          case 'abatros.com': Bucket='abatros'; break;
          case 'ultimheat.co.th': Bucket='blueink'; break;
          default: return null;
        }

        return 's3://' + path.join(Bucket,pathname,'index.md');
      }

      /*
      console.log(`@79 url:`,item.data.url)
      // convert url into s3://
      ............. NOOOO it should be in current subsite...
      subsite => path => results ???? hummm
      */

      //console.log(`TODO@94 reverse-url <${url}>`,{hostname},{pathname});
      //throw 'TODO@94 reverse-url'
      Session.set('s3-url',s3_url);
      /*

      */
//      const s3fn = path.join(tp.s3dir, name.value, 'index.md')
//      Session.set('s3-url', 's3://'+s3fn) // will change reactively the content.
    } // name
  },
})

TP.helpers({
  items: ()=>{
    const x = timeStamp.get();
    return listing; // an array of pages.
//    return listing && listing.list(); // reactive
  }
})

// ------------------------------------------------------------------------

function deep_search (tp, vpath, query) {
//  tp.max_results_reached.classList.add('nodisplay')
  //    tp.execute_query(query);
  Meteor.call('deep-search',{vpath, query}, (err,data)=>{
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
    console.log(`found ${pages.length} pages data:`,data)

    listing = data.pages; // or pages.set(..)
    timeStamp.set(new Date().getTime())
    // limit to 100 results

    // tp.busy_flag.classList.add('hidden')

  }); // call deep-search
} // function dee_search

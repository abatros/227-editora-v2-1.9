import './history-panel.html'
import utils from '/shared/utils.js'
import path from 'path';
import assert from 'assert';
import {parse_s3filename} from '/shared/utils.js'

const verbose =1;
const TP = Template.history_panel;


// ---------------------------------------------------------------------------

/*

    This autorun must react even when right-panel-directory not open.

*/


const hlist = new ReactiveArray(); // set by autorun.

add_item_to_history = function(item) {
  // if item exists in the list, update LastVisited. stop.
  // sort the list only when requested in the panel.
  // restore the list in localStorage
  if (typeof item == 'string') {
    // only for new items - dont change when loading from localStorage
    item = {fn:item, lastVisited: new Date().getTime()}
  }

  const h = hlist.array();
  const i = h.findIndex(it => (it.fn == item.fn))
  if (i<0) {
      hlist.push(item);
  } else {
      //console.log(`found <${s3fn}> at position:${i}`)
    const x = hlist.splice(i,1);
      //console.log({x})
    assert(x[0].fn == item.fn)
    hlist.push(item)
      // newest always at the end => just use reverse.
  }

  console.log(`ADD ITEM TO HISTORY ***************************new hlist:`,hlist.array())
  localStorage.setItem('history',JSON.stringify(hlist.array()))
}

// used here only.
const remove_item_from_history = function(url) {
  const h = hlist.array();
  const i = h.findIndex(it => (it.fn == url))
  if (i>=0) {
      //console.log(`found <${s3fn}> at position:${i}`)
    const x = hlist.splice(i,1);
      //console.log({x})
    assert(x[0].fn == url)
  }
}



Tracker.autorun(function(){
  const verbose =1;
  console.log(`>>> history-panel::autorun`)
/*
  dir3list.splice(0,9999) // reactive var
  dir3list.push(...h_);
*/
}) // autorun

// --------------------------------------------------------------------------


// ---------------------------------------------------------------------------

TP.onCreated(function(){
  ;(verbose >0) && console.log(`history-panel.onCreated`)
  const tp = this;
  ;(verbose >0) && console.log(`history-panel.onCreated`)
  const _h = localStorage.getItem('history');
  const history = (_h && JSON.parse(_h)) || [];
//  console.log(`@@@@@@@@@@@@@@@@@@@fresh from localStorage:`,{history})
  history.forEach(it=>{
  //  console.log(`-- `,it)
    add_item_to_history(it) // object here, not a string
  })
//  add_item_to_history('blueink/np/1202-Y3K2/index.md')
  localStorage.setItem('history',JSON.stringify(hlist.array()))
})

TP.onRendered(function(){
  const tp = this;
  ;(verbose >0) && console.log(`history-panel.onRendered`)
///  const input = tp.find('input');
})


TP.events({
  'submit form': (e,tp)=>{
    e.preventDefault()
    const btn_Name = e.originalEvent.submitter.name;

    const form = e.currentTarget
    const fname = form.getAttribute('name');
    console.log(`submit <${fname}>`)
    // add_item_to_history(fname)
    FlowRouter.go(`/edit?s3=${fname}`)
  },
  'click .js-checkbox': (e,tp)=>{
//    e.preventDefault(); // prevent submit. NO!
    const form = e.currentTarget
    const fname = form.getAttribute('name');
    console.log(`click checkbox <${fname}>`)
    /************************************************************
        (1+ checkbox checked) => show the trash can.
    *************************************************************/
    const v = tp.findAll('input.js-checkbox:checked');
    console.log({v})
    const trash_can = tp.find('span.trash-can')
    console.log({trash_can})
    if (v.length >0) {
      trash_can.classList.remove('hidden')
    } else {
      trash_can.classList.add('hidden')
    }
    return 0;
  },
  'click .trash-can': (e,tp)=>{
    // for each checked : remove from hlist

    const v = tp.findAll('input.js-checkbox:checked');
    console.log({v})
    v.forEach(it =>{
      console.log(`-- remove <${it.value}>`,it)
      remove_item_from_history(it.value)
    })

  console.log(`-- update localStorage`)
  localStorage.setItem('history',JSON.stringify(hlist.array()))

  }
})

function dateDiff(timestamp, structure = dateDiff.structure) {
    let delta = Math.abs(timestamp - new Date().getTime()) / 1000;
    let res = {};

		for(let key in structure) {
        res[key] = Math.floor(delta / structure[key]);
        delta -= res[key] * structure[key];
    }

    return res;
}

dateDiff.structure = {
  year: 31536000,
  month: 2592000,
  week: 604800, // uncomment row to ignore
  day: 86400,   // feel free to add your own row
  hour: 3600,
  minute: 60,
  second: 1
};


TP.helpers({
  hlist: ()=>{
    const today = new Date()
    const isToday = (someDate) => {
      return someDate.getDate() == today.getDate() &&
        someDate.getMonth() == today.getMonth() &&
        someDate.getFullYear() == today.getFullYear()
    }

    const x = hlist && hlist.list(); // reactive
    let y = x.array();
    y = y.map(it=>{
      const lastVisited = new Date(it.lastVisited)
      if( isToday(new Date(it.lastVisited))) {
//        it.time = lastVisited.toLocaleString();
        const d = dateDiff(it.lastVisited)
        //console.log(`@@@@@@@@@@@@@@@@@@@@`,{d})
        if (d.hour) it.time = `${d.hour}:${d.minute} ago`
        else if (d.minute) it.time = `${d.minute}&ThinSpace;min ${d.second}`
        else if (d.second) it.time = `${d.second} sec ago`
        else it.time = 'a few sec ago'
      } else {
        it.time = lastVisited.toLocaleString();
      }
      return it;
    })
    ;(verbose >0) && console.log({y})
    return y.reverse();
  },
})


// ===========================================================================


FlowRouter.route('/history', { name: 'history',
  triggerEnter: [
    function(context, redirect) {
    }
  ],
  action: function(params, queryParams){
    const verbose =1;
    console.log('Router::action for: ', FlowRouter.getRouteName());
    ;(verbose >0) && console.log(' --- params:',params);
    document.title = "editora-v2";
    ;(verbose >0) && console.log(`@210: host:`,location.host)
    const {host} = location;
//    BlazeLayout.render('history_panel');
    Session.set('panel','history-panel')
    BlazeLayout.render('edit_article');

  }
});

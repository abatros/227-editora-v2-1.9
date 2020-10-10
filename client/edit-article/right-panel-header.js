import './right-panel-header.html'

const verbose =0;
const TP = Template.right_panel_header;

TP.onRendered(function() {
})

/*
function select_rpanel(tp, x) {
  let v = [
    'showing-edit-panel',
    'showing-info-panel',
    'showing-dir3-panel',
    'showing-deep-search-panel'
  ].filter(it =>{
    Session.set(it, false)
    return (x == it)
  })

  if (v.length == 1) {
//    Session.set(v[0],true)
    Session.set('panel',v[0])
    return;
  }

  console.error('@18 error in select_rpanel ',{v})
} **/


TP.events({
  'click': (e,tp)=>{
    const v = tp.findAll('div.right-panel-btn');
    v.forEach(it=>{
      it.classList.remove('active') // light off.
    })

    ;(verbose >0) &&console.log('@26 click ',{tp},{e})
    ;(verbose >0) &&console.log('@27 click ',e.target)
    ;(verbose >0) &&console.log('@28 click ',e.target.classList.contains('active'))
    ;(verbose >0) &&console.log('@29 click ',e.target.classList.toggle('active'))
    ;(verbose >0) &&console.log('@30 click ',e.target.getAttribute('data'))
    const data = e.target.getAttribute('data')
//    Session.set(data,true)
//    select_rpanel(tp, data)

    Session.set('panel',data)
  },
})

TP.helpers({
  allowed: (x) =>{
    const p = Session.get('user-profile');
    if (!p) return false;
//    console.log(`>>>>>>>>>`,p.panels)
    return (p.panels.indexOf(x)>=0);
  }
})


Template.right_panel_btn.events({
  'xclick': (e, tp)=>{
    //e.preventDefault();
    ;(verbose >0) &&console.log(`@47 `,{tp})
    // Session.set('showing-'+tp.data.name+'-panel',true)
    //return 0;
  }
})

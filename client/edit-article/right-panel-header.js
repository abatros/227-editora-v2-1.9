import './right-panel-header.html'

const verbose =0;
const TP = Template.right_panel_header;

TP.onRendered(function() {
})

function select_rpanel(tp, x) {
  let v = [
    'showing-preview-panel',
    'showing-info-panel',
    'showing-directory-panel',
    'showing-deep-search-panel'
  ].filter(it =>{
    Session.set(it, false)
    return (x == it)
  })

  if (v.length == 1) {
    Session.set(v[0],true)
    return;
  }

  console.error('@18 error in select_rpanel ',{v})
}

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
    select_rpanel(tp, data)
  },
})


Template.right_panel_btn.events({
  'xclick': (e, tp)=>{
    //e.preventDefault();
    ;(verbose >0) &&console.log(`@47 `,{tp})
    Session.set('showing-'+tp.data.name+'-panel',true)
    //return 0;
  }
})

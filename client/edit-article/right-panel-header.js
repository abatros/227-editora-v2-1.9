import './right-panel-header.html'

const verbose =0;
const TP = Template.right_panel_header;

TP.onRendered(function() {
})


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

    console.log(`@26 [${module.id}] panel:=<${data}>`)
    switch(data) {
      case 'showing-history-panel' : FlowRouter.go('/history'); break;
      default:
      Session.set('panel',data)
    }
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

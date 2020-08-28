import './status-lights.html';

const TP = Template.status_lights;


TP.onCreated(function() {
  console.log(``)
  const tp = this;

})


TP.onRendered(function() {
  const tp = this;
  status_lights = tp.findAll('span.js-status-light')
  console.log(`@93 `,{status_lights})

  tp.autorun(() =>{
//    const tp = this;
    const x = Session.get('status-lights')
    console.log(`@6 autorun status `,x)
    console.log(`@311 `, status_lights);

    status_lights.forEach(it=>{
      console.log(`@312 `, it.attributes.color, {it});
      if (it.id == x) {
        it.style['background-color'] = it.attributes.color.value;
      } else {
        it.style['background-color'] = 'darkgray'
      }
  //      console.log(it.style);
    })
  })

})

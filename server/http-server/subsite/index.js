/***************************************************************************

Package subsite (openACS)

- index (welcome page) and pages.
- pdf/print option.

***************************************************************************/


module.exports = {
  init_instance,
  page: require('./page-handler.js'),
  get_instance,
}


const instances ={}


async function init_instance (o){
  console.log(`@19 [${module.id}] init-instance `,{o})
  const {url} = o;
  console.log(`@6 init-instance "${url}"`);

  instances[url] = o;

 // it should be a generic handler. ???
  WebApp.connectHandlers.use(`/${url}`, require('./toc-handler.js'));
  WebApp.connectHandlers.use(`/${url}/`, require('./page-handler.js'));
}



function get_instance(url) {
  if (url.startsWith('/')) url = url.substring(1);
  //console.log(`@16 [${module.id}] get_instance(${url})`,{instances})
  const retv = instances[url]
  //console.log(`@17 `,retv)
  return retv;
}

function find_instance(url) {
}

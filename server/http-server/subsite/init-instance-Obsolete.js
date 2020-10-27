import { WebApp , WebAppInternals } from 'meteor/webapp';
const page = require('./page.js');
const toc = require('./toc.js');
const {get_instance, push_instance} = require('./utils.js')
const {caltek_handler} = require('./index.js');
//const instances ={}

module.exports = {init_instance};

/*
async function get_instance(url) {
  return instances[url];
} */

async function init_instance (o){
  console.log(`@2 init-instance caltek-book `,{o})
  const {url} = o;
  console.log(`@6 init-instance "${url}"`);

  /*
  if (instances[url]) {
    console.warn(`@16 [${module.id}] url <${url}> already registered. Ignored`)
    return;
  }

  instances[url] = o;
  */

  push_instance(o)

  //WebApp.connectHandlers.use('/caltek/page/index', toc);
  //WebApp.connectHandlers.use(`/${url}`, page);
  //WebApp.connectHandlers.use(`/${url}/index`, toc);
//  console.log(`@40 `,{x})
//  console.log(`@41 `,x.stack)
//  console.log(`@42 `,WebApp.connectHandlers.stack)

//  WebApp.connectHandlers.use(`/${url}`, caltek_handler); // it should be a generic handler.
  WebApp.connectHandlers.use(`/${url}`, toc); // it should be a generic handler.
  WebApp.connectHandlers.use(`/${url}/`, page); // it should be a generic handler.

//  console.log(`@40 `,WebAppInternals)

}

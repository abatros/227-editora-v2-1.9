module.exports = {
  list_pages() {},
  get_instance,
  push_instance,
  find_instance,
}



const instances ={}

function push_instance(i) {
  instances[i.url] = i;
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

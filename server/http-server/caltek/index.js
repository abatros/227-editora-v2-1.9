const page = require('./page.js');
const toc = require('./toc.js');
const {init_instance} = require('./init-instance.js');

module.exports = {
  page,
  toc,
  init_instance,
  caltek_handler
}

/******************************************************************************

  Generic handler for this package (caltek-book)
  The route will tell which caltek-book instance to use.

*******************************************************************************/


async function caltek_handler(req, res) {
  // multiple routes can reach this handler.
  // find the instance associated with this route

  const url = req.originalUrl;
  console.log(req)
  res.status(200).end('caltek_handler');
}

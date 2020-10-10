import { WebApp } from 'meteor/webapp';

import path from 'path';
import yaml from 'js-yaml';
import assert from 'assert';

import {extract_metadata} from '/shared/utils.js'
let db = null; //  must be in async await postgres_connect();
const {postgres_connect} = require('/server/lib/postgres-connect.js')
//const {list_articles} = require('./utils.js')

const verbose =0;

const s3 = require('/server/lib/aws-s3.js')();

// ---------------------------------------------------------------------------

WebApp.connectHandlers.use('/abatros/page/', page);

async function page(req, res) {
  res.status(200).end(`this is a page from abatros.`)
}

#! /usr/bin/env node

const s3 = require('../server/lib/aws-s3.js')();
//const util = require('util')
//const stream = require('stream')
//const pipeline = util.promisify(stream.pipeline);


const s = s3.__s3client.getObject({
  Bucket: 'caltek',
  Key: 'books/101-dont-go-where/102-chapter-2.md'
}).createReadStream();


/*
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
var params = {Bucket: 'myBucket', Key: 'myImageFile.jpg'};
s3.getObject(params).createReadStream().pipe(process.stdout);
*/

s.pipe(process.stdout)

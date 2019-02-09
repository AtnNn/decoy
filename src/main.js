let {complete} = require('./parse')
let {toplevel} = require('./grammar')
let fs = require('fs');

let source = fs.readFileSync(process.argv[2]);
console.log(complete(toplevel)(source, 0));

let {complete} = require('./parse');
let {toplevel, start} = require('./grammar');
let {eval_defs, strict} = require('./interpreter');
let fs = require('fs');
let builtins = require('./builtins');

let source = fs.readFileSync(process.argv[2]).toString('utf8');
let res = complete(toplevel)(start(source, builtins));
if (res.failed) {
    console.log('parsing failed at ' + res.position + ': ' + res.reason);
} else {
    strict(res.state.env.main);
}

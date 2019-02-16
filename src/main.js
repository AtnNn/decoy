let {complete} = require('./parse')
let {toplevel} = require('./grammar')
let {eval_defs, strict} = require('./interpreter')
let fs = require('fs');

let source = fs.readFileSync(process.argv[2]).toString('utf8');
let res = complete(toplevel)({data:source, position:0, state:{}, scope:{}});
if (res.failed) {
    console.log('parsing failed at ' + res.position + ': ' + res.reason);
} else {
    let env = eval_defs(res.value, {
	add: (a, b) => a + b,
	print: x => console.log(x)
    });
    strict(env.main);
}

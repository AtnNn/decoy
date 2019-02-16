let {complete} = require('./parse')
let {toplevel} = require('./grammar')
let {eval_defs, strict} = require('./interpreter')
let fs = require('fs');

let source = fs.readFileSync(process.argv[2]);
let defs = complete(toplevel)({data:source, position:0, state:{}, scope:{}}).value;
let env = eval_defs(defs, {
    add: (a, b) => a + b,
    print: x => console.log(x)
});
strict(env.main);

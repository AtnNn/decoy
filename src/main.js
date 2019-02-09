let {complete} = require('./parse')
let {toplevel} = require('./grammar')
let {eval_decls, strict} = require('./interpreter')
let fs = require('fs');

let source = fs.readFileSync(process.argv[2]);
let decls = complete(toplevel)(source, 0).value;
let env = eval_decls(decls, {
    add: (a, b) => a + b,
    print: x => console.log(x)
});
strict(env.main);

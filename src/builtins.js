let fs = require('fs');
let {strict, struct, special_function} = require('./interpreter');
let {toplevel, start} = require('./grammar');

let builtins = {
    toplevel, start,
    add: (a, b) => a + b,
    print: x => console.log(x),
    true: () => struct('true', [], builtins),
    false: () => struct('false', [], builtins),
    for: (container, f) => {
	if (container.constructor === Object) {
	    let ret = [];
	    for (let k in container) {
		ret.push(strict(f)(k, container[k]));
	    }
	    return ret;
	}
	if (Array.isArray(container)) {
	    return container.map(strict(f));
	}
	throw new Error('for: argument is not an array or object');
    },
    nth: (i, array) => array[i],
    do: new special_function((...args) => {
	let val;
	for (let arg in args) {
	    val = strict(arg);
	}
	return val;
    }),
    new_env: () => ({ __parent_scope: builtins }),
    read_file: path => fs.readFileSync(path).toString('utf8')
};

module.exports = builtins;

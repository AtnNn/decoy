let ast = require('./ast');

let eval_decls = (decls, initial_env) => {
    env = {...initial_env};
    for (let decl of decls) {
	env[decl.lhs.name] = () => eval(decl.rhs, env);
    }
    return env;
};

let eval = (expr, env) => {
    if (expr.constructor === ast.identifier) {
	return env[expr.name];
    }
    if (expr.constructor === ast.number) {
	return expr.value;
    }
    if (expr.constructor === ast.string) {
	return expr.value;
    }
    if (expr.constructor === ast.application) {
	return call(expr.children.map(x => eval(x, env)));
    }
    if (expr.constructor === ast.lambda) {
	return lambda(expr.params.name, expr.body, env);
    }
    throw new Error('invalid expression');
};

let call = exprs => {
    let fun = exprs[0];
    let args = exprs.slice(1);
    while (args.length > 0) {
	let n = Math.min(fun.length, args.length);
	fun = fun.apply(undefined, args.slice(0, n));
	args = args.slice(n);
    }
    return fun;
};

let strict = f => {
    while (f instanceof Function && f.length == 0) {
	f = f();
    }
    return f;
};

let lambda = (param, body, env) => {
    return arg => {
	let local = { ...env };
	local[param] = arg;
	return eval(body, local);
    };
};

module.exports = { eval_decls, strict, eval };

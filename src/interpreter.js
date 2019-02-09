let ast = require('./ast');

let eval_defs = (defs, initial_env) => {
    env = {...initial_env};
    for (let def of defs) {
	if (def.constructor === ast.struct) {
	    env[def.name.name] = struct(def.name.name, def.fields.map(x => x.name), env);
	}
	if (def.constructor === ast.declaration) {
	    env[def.lhs.name] = () => eval(def.rhs, env);
	}
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

let struct = (name, fields, env) => {
    fields = [...fields];
    fields.reverse();
    let fun = obj => ({ __type: name, ...obj });
    for (let field of fields) {
	let nextf = fun;
	fun = obj => x => nextf({...obj, [field]: x});
    }
    return fun({});
};

module.exports = { eval_defs, strict, eval };

let ast = require('./ast');

let record = function record(name, fields, field_names) {
    this.name = name
    this.fields = fields;
    this.field_names = field_names;
};

let eval_defs = (defs, initial_env) => {
    let env = {...initial_env};
    for (let def of defs) {
	if (def.constructor === ast.struct) {
	    env[def.name.name] = struct(def.name.name, def.fields.map(x => x.name), env);
	} else if (def.constructor === ast.declaration) {
	    env[def.lhs.name] = () => eval(def.rhs, env);
	} else {
	    throw new Error('unknown def');
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
	return lambda(expr.params, expr.body, env);
    }
    if (expr.constructor === ast.switch_) {
	return switch_(eval(expr.value, env), expr.cases, env);
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

let lambda = (params, body, env) => {
    params = [...params];
    params.reverse();
    let fun = env => eval(body, env);
    for (let param of params) {
	let nextf = fun;
	fun = env => x => {
	    let res = match(param, x);
	    if (res.failed) {
		throw new Error('failed match');
	    }
	    return nextf({...env, ...res.env});
	};
    }
    return fun(env);
};

let struct = (name, infields, env) => {
    fields = [...infields];
    fields.reverse();
    let fun = obj => new record(name, obj, infields);
    for (let field of fields) {
	let nextf = fun;
	fun = obj => x => nextf({...obj, [field]: x});
    }
    return fun({});
};

let match = (pattern, val) => {
    if (pattern.constructor === ast.identifier) {
	return { env: { [pattern.name]: val } };
    }
    if (pattern.constructor === ast.application) {
	if(val instanceof record && val.name === pattern.children[0].name) {
	    let params = pattern.children.slice(1);
	    if (params.length != val.field_names.length) {
		return {failed: true};
	    }
	    let env = {};
	    for (let i in params) {
		let res = match(params[i], val.fields[val.field_names[i]]);
		if (res.failed) {
		    return res;
		}
		env = { ...env, ...res.env };
	    }
	    return {env};
	}
	return {failed: true};	
    }
    throw new Error('invalid pattern');
}

let switch_ = (value, cases, env) => {
    for (let case_ of cases) {
	let res = match(case_.pattern[0], value);
	if (!res.failed) {
	    return eval(case_.body, { ...env, ...res.env });
	}
    }
    throw new Error('no matching case');
};

module.exports = { eval_defs, strict, eval, record };

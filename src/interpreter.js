let ast = require('./ast');
let {record} = require('./data');

let eval_defs = (defs, initial_env) => {
    let env = {...initial_env};
    for (let def of defs) {
	if (ast.is_struct(def)) {
	    env[def.fields.name.fields.name] = struct(def.fields.name.fields.name, def.fields.fields.map(x => x.fields.name), env);
	} else if (ast.is_declaration(def)) {
	    env[def.fields.lhs.fields.name] = () => eval(def.fields.rhs, env);
	} else {
	    throw new Error('unknown def');
	}
    }
    return env;
};

let eval = (expr, env) => {
    if (ast.is_identifier(expr)) {
	return env[expr.fields.name];
    }
    if (ast.is_number(expr)) {
	return expr.fields.value;
    }
    if (ast.is_string(expr)) {
	return expr.fields.value;
    }
    if (ast.is_application(expr)) {
	return call(expr.fields.children.map(x => eval(x, env)));
    }
    if (ast.is_lambda(expr)) {
	return lambda(expr.fields.params, expr.fields.body, env);
    }
    if (ast.is_switch(expr)) {
	return switch_(eval(expr.fields.value, env), expr.fields.cases, env);
    }
    if (ast.is_quote(expr)) {
	return ast.reduce(expr.fields.ast, syntax => quote1(syntax, env));
    }
    if (ast.is_antiquote(expr)) {
	return eval(strict(eval(expr.fields.expression, expr.fields.parse_env)), env);
    }
    throw new Error('invalid expression');
};

let quote1 = (syntax, env) => {
    if (ast.is_antiquote(syntax)) {
	return eval(syntax.expression, env);
    }
    return syntax;
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
    val = strict(val);
    if (ast.is_identifier(pattern)) {
	return { env: { [pattern.fields.name]: val } };
    }
    if (ast.is_application(pattern)) {
	if(val instanceof record && val.name === pattern.fields.children[0].fields.name) {
	    let params = pattern.fields.children.slice(1);
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
	let res = match(case_.fields.pattern[0], value);
	if (!res.failed) {
	    return eval(case_.fields.body, { ...env, ...res.env });
	}
    }
    throw new Error('no matching case');
};

module.exports = { eval_defs, strict, eval, record };

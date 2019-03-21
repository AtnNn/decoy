let ast = require('./ast');
let {record} = require('./data');
let {pretty_loc} = require('./parse');
let util = require('util');

//let eval_trace = (...args) => console.error('eval', ...args);
let eval_trace = (..._) => null;

function eval_error(...args) {
    this.trace = (new Error()).stack;
    this.message = util.format(...args);
    this.loc = [];
}

eval_error.prototype.add_loc = function(loc) {
    this.loc.push(loc);
    this.message = this.message + '\n    at ' + pretty_loc(loc);
};

eval_error.prototype.toString = function() {
    return this.message + '\n' + this.trace.replace(/^.*\n/, '');
};

let eval_defs = (defs, env) => {
    for (let def of defs) {
	if (ast.is_struct(def)) {
	    env[def.fields.name.fields.name] = struct(def.fields.name.fields.name, def.fields.fields.map(x => x.fields.name));
	} else if (ast.is_declaration(def)) {
	    env[def.fields.lhs.fields.name] = thunk(() => eval(def.fields.rhs, env));
	} else {
	    throw new eval_error('unknown def', def);
	}
    }
};

let thunk = f => {
    let val = undefined;
    return () => {
	if (val === undefined) {
	    val = f();
	}
	return val;
    };
};

let eval = (expr, env) => {
    try {
	if (ast.is_identifier(expr)) {
	    eval_trace('lookup:', expr.fields.name);
	    return lookup(env, expr.fields.name);
	}
	if (ast.is_number(expr)) {
	    return expr.fields.value;
	}
	if (ast.is_string(expr)) {
	    return expr.fields.value;
	}
	if (ast.is_application(expr)) {
	    eval_trace('application:', expr.fields.children);
	    let children = expr.fields.children.map(x => eval(x, env));
	    return call(children);
	}
	if (ast.is_lambda(expr)) {
	    return lambda(expr.fields.pattern, expr.fields.body, env);
	}
	if (ast.is_switch(expr)) {
	    eval_trace('switch:', expr.fields.value);
	    return switch_(eval(expr.fields.value, env), expr.fields.cases, env);
	}
	if (ast.is_quote(expr)) {
	    return quasiquote(expr.fields.ast, env);
	}
	if (ast.is_antiquote(expr)) {
	    return eval(strict(eval(expr.fields.expression, expr.fields.parse_env)), env);
	}
	if (ast.is_access(expr)) {
	    return access(strict(eval(expr.fields.namespace, env)), expr.fields.name.fields.name);
	}
	throw new eval_error('invalid expression', expr);
    } catch (err) {
	if (err instanceof eval_error) {
	    err.add_loc(expr.fields.loc);
	}
	throw err;
    }
};

let lookup = (env, name) => {
    if (name in env) {
	return env[name];
    }
    if ('__parent_scope' in env) {
	return lookup(env.__parent_scope, name);
    }
    throw new eval_error('identifier not in scope:', name);
};

let call = exprs => {
    let fun = strict(exprs[0])
    let args = exprs.slice(1);
    if (fun instanceof special_function) {
	return fun.special(...args);
    }
    while (args.length > 0) {
	if (!(fun instanceof Function)) {
	    throw new eval_error('call: not a function:', fun);
	}
	let n = Math.min(fun.length, args.length);
	fun = fun(...args.slice(0, n));
	args = args.slice(n);
    }
    return fun;
};

let strict = f => {
    while (f instanceof Function && f.length == 0) {
	f = f();
	eval_trace('stricted:', f);
    }
    return f;
};

let lambda = (params, body, outer_env) => {
    params = [...params];
    params.reverse();
    let fun = inner_env => {
	return eval(body, { __parent_scope: outer_env, ...inner_env });
    };
    for (let param of params) {
	let nextf = fun;
	fun = inner_env => x => {
	    let res = match(param, x);
	    if (res.failed) {
		throw new Error('failed match: ' + res.reason);
	    }
	    eval_trace('lambda bound:', res.env);
	    return nextf({...inner_env, ...res.env});
	};
    }
    return fun({});
};

let struct = (name, infields) => {
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
    eval_trace('match:', pattern);
    if (ast.is_quote(pattern)) {
	pattern = quote_binding(pattern.fields.ast);
    }
    val = strict(val);
    if (ast.is_identifier(pattern)) {
	eval_trace('match identifier:', pattern.fields.name, val);
	return { env: { [pattern.fields.name]: val } };
    }
    if (ast.is_application(pattern)) {
	if(val instanceof record && val.name === pattern.fields.children[0].fields.name) {
	    let params = pattern.fields.children.slice(1);
	    if (params.length != val.field_names.length) {
		return {
		    failed: true,
		    reason: "param count mismatch in " + val.name};
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
	return {
	    failed: true,
	    reason: val.name + " does not match " + pattern.fields.children[0].fields.name
	};
    }
    if (typeof(pattern) === 'bigint' || typeof(pattern) === 'string') {
	if (val === pattern) {
	    return {env: {}};
	}
	return {failed: true,
		reason: val + " !== " + pattern};
    }
    if (Array.isArray(pattern)) {
	if (!Array.isArray(val)) {
	    return {failed: true,
		    reason: 'expected array'};
	}
	if (pattern.length != val.length) {
	    return {failed: true,
		    reason: 'expected arrays of same length'};
	}
	let env = {};
	for (let index in pattern) {
	    let res = match(pattern[index], val[index]);
	    if (res.failed) {
		return res;
	    }
	    env = { ...env, ...res.env };
	}
	return {env};
    }
    eval_trace('invalid pattern:', pattern);
    throw new Error('invalid pattern');
}

let switch_ = (value, cases, env) => {
    let fails = [];
    for (let case_ of cases) {
	let res = match(case_.fields.pattern[0], value);
	if (!res.failed) {
	    return eval(case_.fields.body, { __parent_scope: env, ...res.env });
	} else {
	    fails.push(res.reason);
	}
    }
    throw new Error(pretty_loc(cases[0].fields.loc) + ': no matching case: ' + fails);
};

let quote_binding = quoted => {
    let q = quote_binding;
    let app = (name, ...args) => {
	return ast.mk_application(
	    quoted.fields.loc,
	    [ast.mk_identifier(quoted.fields.loc, name),
	     ast.mk_identifier(quoted.fields.loc, '_'),
	     ...args]);
    };
    if (ast.is_antiquote(quoted)) {
	return quoted.fields.expression;
    }
    if (ast.is_declaration(quoted)) {
	return app('declaration', q(quots.fields.lhs), q(quots.fields.rhs));
    }
    if (ast.is_application(quoted)) {
	return app('application', quoted.fields.children.map(q));
    }
    if (ast.is_number(quoted)) {
	return app('number', quoted.fields.value)
    }
    if (ast.is_string(quoted)) {
	return app('string', quoted.fields.value)
    }
    if (ast.is_lambda(quoted)) {
	return app('lambda', quoted.fields.pattern.map(q), q(quoted.fields.body));
    }
    if (ast.is_struct(quoted)) {
	return app('struct', q(quoted.fields.name), quoted.fields.fields.map(q));
    }
    if (ast.is_switch(quoted)) {
	return app('switch', q(quoted.fields.value), quoted.fields.cases.map(q));
    }
    if (ast.is_quote(quoted)) {
	return app('quote', quote(quoted.fields.ast,
				  antiquoted => {
				      throw new Error("nested quote binding with antiquote not implemented");
				  }));
    }
    if (ast.is_identifier(quoted)) {
	return app('identifier', quoted.fields.name);
    }
    throw new Error('quote_binding: unknown syntax');
};

let quasiquote = (quoted, env) => {
    let q = syntax => quasiquote(syntax, env);
    if (ast.is_antiquote(quoted)) {
	return eval(quoted.fields.expression, env);
    }
    if (ast.is_declaration(quoted)) {
	return mk_declaration(quoted.fields.loc, q(quots.fields.lhs), q(quots.fields.rhs));
    }
    if (ast.is_application(quoted)) {
	return ast.mk_application(quoted.fields.loc, quoted.fields.children.map(q));
    }
    if (ast.is_number(quoted)) {
	return quoted;
    }
    if (ast.is_string(quoted)) {
	return quoted;
    }
    if (ast.is_lambda(quoted)) {
	return ast.mk_lambda(quoted.fields.loc, quoted.fields.pattern.map(q), q(quoted.fields.body));
    }
    if (ast.is_struct(quoted)) {
	return ast.mk_struct(quoted.fields.loc, q(quoted.fields.name), quoted.fields.fields.map(q));
    }
    if (ast.is_switch(quoted)) {
	return ast.mk_switch(quoted.fields.loc, q(quoted.fields.value), quoted.fields.cases.map(q));
    }
    if (ast.is_quote(quoted)) {
	return quoted;
    }
    if (ast.is_identifier(quoted)) {
	return quoted;
    }
    eval_trace('unkown syntax:', quoted);
    throw new Error('quasiquote: unknown syntax');
};

let access = (namespace, name) => {
    let obj = {};
    if (namespace instanceof record) {
	obj = namespace.fields;
    } else if (namespace.constructor = Object) {
	obj = namespace;
    } else {
	throw new Error("accessing field '" + name + "' of non-namespace");
    }
    if (!obj.hasOwnProperty(name)) {
	throw new Error("namespace does not contain '" + name + "'");
    }
    return obj[name];
};

function special_function(f) {
    this.special = f;
}

module.exports = { eval_defs, strict, eval, record, call, struct, special_function };

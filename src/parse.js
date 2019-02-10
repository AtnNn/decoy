let match = regex => (input, position, state) => {
    new_regex = RegExp(regex.source, regex.flags + 'y');
    new_regex.lastIndex = position;
    let res = new_regex.exec(input);
    if (!res) {
	return failed(position, 'match: could not match /' + regex.source + '/' + regex.flags);
    }
    return {
	position: new_regex.lastIndex,
	value: res[0]
    };
};

let failed = (position, reason) => ({failed: true, position, reason});

let value = x => ({value: x});

let many = parser => (input, position, state) => {
    let first = parser(input, position, state)
    if (first.failed) {
	return { position: position, value: [] };
    }
    let rest = many(parser)(input, first.position, first.state)
    return {
	position: rest.position,
	value: [first.value, ...rest.value],
	state
    };
};

let many1 = parser => parse(parser, x =>
			    parse(many(parser), xs =>
				  value([x, ...xs])));

let one_of = parsers => (input, position, state) => {
    if (parsers === []) {
	return failed(position, 'one_of: no parsers!');
    }
    let reasons = [];
    for (let parser of parsers) {
	let res = parser(input, position, state);
	if (!res.failed) {
	    return res;
	}
	reasons.push(res.position + ': ' + res.reason);
    }
    return failed(position, 'one_of: none of the parsers matched:\n  ' + reasons.join('\n  '));
};

let or_else = (a, b) => (input, position, state) => {
    let res = a(input, position, state);
    if (!res.failed) {
	return res;
    }
    return b(input, position, state);
};

let parse = (parser, f) => (input, position, state) => {
    let res = parser(input, position, state);
    if (res.failed) {
	return res;
    }
    let next = f(res.value);
    if ('position' in next) {
	return next;
    }
    if ('value' in next || 'failed' in next) {
	return { position: res.position, state: res.state, ...next };
    }
    return next(input, res.position, res.state);
};

let digit = match(/[0-9]/);

let sequence = parsers => (input, position, state) => {
    values = [];
    for (let parser of parsers) {
	let res = parser(input, position, state);
	if (res.failed) {
	    return res;
	}
	values.push(res.value);
	position = res.position;
	state = res.state;
    }
    return { value: values, position, state };
};

let any = match(/[^]/);

let char = expect => parse(any, next => {
    if (expect == next) {
	return value(next);
    }
    return {failed: true, reason: "char: expected '" + expect + "'"};
});

let complete = parser => (input, position, state) => {
    let res = parser(input, position, state);
    if (res.failed) {
	return res;
    }
    if (res.position !== input.length) {
	return failed(res.position, 'complete: expected end of input');
    }
    return res;
};

let lazy = parser => (input, position, state) => parser()(input, position, state);

module.exports = {
    many, many1, failed, value, one_of, or_else, parse, sequence, char, digit, match, complete, any, lazy
};

let match = regex => (input, position) => {
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

let many = parser => (input, position) => {
    let first = parser(input, position)
    if (first.failed) {
	return { position: position, value: [] };
    }
    let rest = many(parser)(input, first.position)
    return {
	position: rest.position,
	value: [first.value, ...rest.value]
    };
};

let one_of = parsers => (input, position) => {
    if (parsers === []) {
	return failed(position, 'one_of: no parsers!');
    }
    let reasons = [];
    for (let parser of parsers) {
	let res = parser(input, position);
	if (!res.failed) {
	    return res;
	}
	reasons.push(res.position + ': ' + res.reason);
    }
    return failed(position, 'one_of: none of the parsers matched:\n  ' + reasons.join('\n  '));
};

let or_else = (a, b) => (input, position) => {
    let res = a(input, position);
    if (!res.failed) {
	return res;
    }
    return b(input, position);
};

let parse = (parser, f) => (input, position) => {
    let res = parser(input, position);
    if (res.failed) {
	return res;
    }
    let next = f(res.value);
    if ('position' in next) {
	return next;
    }
    if ('value' in next || 'failed' in next) {
	return { position: res.position, ...next };
    }
    return next(input, res.position);
};

let digit = match(/[0-9]/);

let sequence = parsers => (input, position) => {
    values = [];
    for (let parser of parsers) {
	let res = parser(input, position);
	if (res.failed) {
	    return res;
	}
	values.push(res.value);
	position = res.position;
    }
    return { value: values, position };
};

let whitespace = match(/[ \r\n\t]+/);

let any = match(/[^]/);

let char = expect => parse(any, next => {
    if (expect == next) {
	return {value: next};
    }
    return {failed: true, reason: "char: expected '" + expect + "'"};
});

let complete = parser => (input, position) => {
    let res = parser(input, position);
    if (res.failed) {
	return res;
    }
    if (res.position !== input.length) {
	return failed(res.position, 'complete: expected end of input');
    }
    return res;
};

module.exports = {
    many, failed, one_of, or_else, parse, sequence, whitespace, char, digit, match, complete, any
};

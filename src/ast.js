module.exports = {
    declaration: function declaration(lhs, rhs){ this.lhs = lhs; this.rhs = rhs; },
    identifier: function identifier(name){ this.name = name; },
    application: function application(children){ this.children = children; },
    number: function number(value){ this.value = value; },
    string: function string(value){ this.value = value; },
    lambda: function lambda(params, body){ this.params = params; this.body = body; }
}

    

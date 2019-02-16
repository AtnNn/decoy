module.exports = {
    declaration: function declaration(lhs, rhs){ this.lhs = lhs; this.rhs = rhs; },
    identifier: function identifier(name){ this.name = name; },
    application: function application(children){ this.children = children; },
    number: function number(value){ this.value = value; },
    string: function string(value){ this.value = value; },
    lambda: function lambda(params, body){ this.params = params; this.body = body; },
    struct: function struct(name, fields){ this.name = name; this.fields = fields; },
    switch_: function switch_(value, cases){ this.value = value; this.cases = cases; },
    case_: function case_(pattern, body){ this.pattern = pattern; this.body = body; },
    macro: function macro(pattern, body){ this.pattern = pattern; this.body = body; }
}

    

module.exports = {
    declaration: function declaration(lhs, rhs){ this.lhs = lhs; this.rhs = rhs; },
    identifier: function identifier(name){ this.name = name; },
    application: function application(){ this.children = [...arguments]; },
    number: function number(value){ this.value = value; },
    string: function string(value){ this.value = value; }
}

    

.PHONY: test
test:
	node src/main.js test/hello.decoy
	node test/grammar.js
	node test/interpreter.js

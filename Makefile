.PHONY: test
test:
	@node src/main.js test/smoke.decoy
	@node test/grammar.js
	@node test/interpreter.js
	@bash test/compiler.sh

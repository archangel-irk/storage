TESTS = $(shell find test/ -name '*.test.js')
REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha $(T) \
		--require chai \
		--reporter $(REPORTER) \
		$(TESTS)

.PHONY: test
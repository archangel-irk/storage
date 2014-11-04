
DOCS_ = $(shell find lib/ -name '*.js')
DOCS = $(DOCS_:.js=.json)
DOCFILE = docs/source/_docs
STABLE_BRANCH = master

docs: ghpages merge_stable docclean gendocs

gendocs: $(DOCFILE)

$(DOCFILE): $(DOCS)
	node website.js

%.json: %.js
	@echo "\n### $(patsubst lib//%,lib/%, $^)" >> $(DOCFILE)
	./node_modules/dox/bin/dox < $^ >> $(DOCFILE)

ghpages:
	git checkout gh-pages

merge_stable:
	git merge $(STABLE_BRANCH)

docclean:
	rm -f ./docs/*.{1,html,json}
	rm -f ./docs/source/_docs

.PHONY: ghpages docs docclean gendocs
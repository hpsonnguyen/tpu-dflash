MAIN = poster

all: figures $(MAIN).pdf

figures:
	cd .. && python poster/generate_figures.py

$(MAIN).pdf: $(MAIN).tex references.bib figures/*.pdf
	pdflatex $(MAIN).tex
	bibtex $(MAIN)
	pdflatex $(MAIN).tex
	pdflatex $(MAIN).tex

clean:
	rm -f *.aux *.bbl *.blg *.log *.nav *.out *.snm *.toc *.fls *.fdb_latexmk *.synctex.gz

distclean: clean
	rm -f $(MAIN).pdf figures/*.pdf figures/*.png

.PHONY: all figures clean distclean

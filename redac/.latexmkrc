# Sortie
$out_dir = 'build';
$aux_dir = 'build';

# Moteurs avec shell-escape (minted)
$pdf_mode = 4;  # 4=lualatex, 5=xelatex
$lualatex = 'lualatex -synctex=1 -interaction=nonstopmode -file-line-error -shell-escape %O %S';
$xelatex  = 'xelatex  -synctex=1 -interaction=nonstopmode -file-line-error -shell-escape %O %S';

# Bibliographie (biblatex)
$biber = 'biber %O %B';
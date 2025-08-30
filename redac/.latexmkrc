# filepath: c:\Users\install\gyminf\redac\.latexmkrc
# Forcer l'utilisation de lualatex
$pdf_mode = 4;

# Ajouter l'option -shell-escape à la commande lualatex
$lualatex = 'lualatex -shell-escape -synctex=1 -interaction=nonstopmode -file-line-error %O %S';

# S'assurer que les autres moteurs l'ont aussi, par sécurité
$pdflatex = 'pdflatex -shell-escape -synctex=1 -interaction=nonstopmode -file-line-error %O %S';
$xelatex = 'xelatex -shell-escape -synctex=1 -interaction=nonstopmode -file-line-error %O %S';

# Option pour que minted puisse créer son dossier de cache
$out_dir = 'build';
ensure_path($out_dir);
$ENV{'TEXMF_OUTPUT_DIRECTORY'} = 'c:/Users/install/gyminf/redac/build';
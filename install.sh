SCRIPT_DIR_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pixi init .
pixi workspace channel add -m pixi.toml "bioconda"
pixi workspace environment add forge

pixi add --no-install \
    bwa=* samtools=* gatk4=* bcftools=* snpeff=* snpsift=* \
    jq=* python=* \
    pyyaml=* pandas=* xlsxwriter=* seaborn=* cyvcf2=* gdown=*

pixi task add forge "python3 main.py" --description "Run Forge"

pixi install -e forge

echo "# >>> added by forge installer >>>" >> ~/.bashrc

echo 'alias forge="pixi run --quiet forge"' >> ~/.bashrc
# echo "export PATH="$SCRIPT_DIR_PATH:$PATH"" >> ~/.bashrc

echo "# >>> forge shell hook >>>" >> ~/.bashrc
pixi shell-hook --shell bash -e forge >> ~/.bashrc
echo "# <<< forge shell hook <<<" >> ~/.bashrc

echo "# <<< added by forge installer <<<" >> ~/.bashrc

source ~/.bashrc

mkdir -p $SCRIPT_DIR_PATH/resources/hg19
gdown --folder https://drive.google.com/drive/folders/14dlUdQPQkqGtBUR0yOQSLiKjkmYdAb8u -O $SCRIPT_DIR_PATH/resources/hg19
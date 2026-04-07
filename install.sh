SCRIPT_DIR_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: << 'BLOCK'
pixi init --format pixi
pixi workspace channel add -m pixi.toml "bioconda"
pixi workspace environment add forge

pixi add --no-install \
    bwa=* samtools=* gatk4=* bcftools=* snpeff=* snpsift=* t1k=* optitype=* delly=* \
    jq=* python=* \
    pyyaml=* pandas=* xlsxwriter=* seaborn=* cyvcf2=*

pixi install -e forge

echo "# >>> added by forge installer >>>" >> ~/.bashrc

echo "# >>> forge shell hook >>>" >> ~/.bashrc
pixi shell-hook --shell bash -e forge >> ~/.bashrc
echo "# <<< forge shell hook <<<" >> ~/.bashrc

echo "export PATH=\"$SCRIPT_DIR_PATH:\$PATH\"" >> ~/.bashrc
chmod +x $SCRIPT_DIR_PATH/forge

echo "# <<< added by forge installer <<<" >> ~/.bashrc

source ~/.bashrc
BLOCK

pixi global install -e forge -c conda-forge -c bioconda \
    fastp=* bwa=* samtools=* gatk4=* bcftools=* snpeff=* snpsift=* t1k=* seqkit=* optitype=* delly=* dicey=* tracy=* \
    jq=* python=* \
    pyyaml=* pandas=* xlsxwriter=* seaborn=* cyvcf2=*

echo "# >>> added by forge installer >>>" >> ~/.bashrc
echo "export PATH=\"$SCRIPT_DIR_PATH:\$PATH\"" >> ~/.bashrc
echo "# <<< added by forge installer <<<" >> ~/.bashrc

chmod +x $SCRIPT_DIR_PATH/forge
source ~/.bashrc


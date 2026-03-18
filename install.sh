pixi init .
pixi workspace channel add -m pixi.toml "bioconda"
pixi workspace environment add forge

pixi add --no-install \
    bwa=* samtools=* gatk4=* bcftools=* snpeff=* snpsift=* \ 
    jq=* python=* \
    pyyaml=* pandas=* xlsxwriter=* seaborn=* cyvcf2=* 

pixi task add forge "python3 main.py" --cwd ${PIXI_PROJECT_ROOT}/ --description "Run Forge"

pixi install -e forge

echo "# >>> added by forge installer >>>" >> ~/.bashrc

echo 'alias forge="pixi run --quiet forge"' >> ~/.bashrc

echo "# >>> forge shell hook >>>" >> ~/.bashrc
pixi shell-hook --shell bash -e forge >> ~/.bashrc
echo "# <<< forge shell hook <<<" >> ~/.bashrc

echo "# <<< added by forge installer <<<" >> ~/.bashrc

source ~/.bashrc
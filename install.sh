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
mkdir -p $SCRIPT_DIR_PATH/resources/hg19/reference_genome_hg19
mkdir -p $SCRIPT_DIR_PATH/resources/hg19/regions_hg19
mkdir -p $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/1000g_omni2_5_hg19
mkdir -p $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/1000g_phase1_indels_hg19
mkdir -p $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/1000g_phase3_v4_20130502_sites_hg19
mkdir -p $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/clinvar_20240716_hg19
mkdir -p $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/dbnsfp4_9a_hg19
mkdir -p $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/esp6500si_v2_ssa137_hg19
mkdir -p $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/dbsnp_138_hg19

gdown --folder https://drive.google.com/drive/folders/1vANlZp3XCvuX5z3_wtsXUxQG7F9VuWdE -O $SCRIPT_DIR_PATH/resources/hg19/reference_genome_hg19

gdown --folder https://drive.google.com/drive/folders/1UYq2BguP6eauKqHv2mMYxXaGs9ZCHxyJ -O $SCRIPT_DIR_PATH/resources/hg19/regions_hg19

gdown --folder https://drive.google.com/drive/folders/1vy-66a_wzsA2ZkOTyM9joun8tkYmOWCO -O $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/dbnsfp4_9a_hg19

gdown --folder https://drive.google.com/drive/folders/1m8bIUFcqSBJ8HZTQZAMIvHx8j2iX2X8P -O $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/clinvar_20240716_hg19

gdown --folder https://drive.google.com/drive/folders/1f_3LKwrM5ZOY22fKFMkipmBy6mnV_jhy -O $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/1000g_phase1_indels_hg19

gdown --folder https://drive.google.com/drive/folders/1LRqNsmfFHeW8ZBL1EWQnMw4vrSNgCplW -O $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/1000g_omni2_5_hg19

gdown --folder https://drive.google.com/drive/folders/1Ev2iYkDpfjiB0Z2FEsui9rSGm211TbXg -O $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/esp6500si_v2_ssa137_hg19

gdown --folder https://drive.google.com/drive/folders/1rDQRq7qsikUzLRPSfG4L2CtFlkbZVOiO -O $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/dbsnp_138_hg19

gdown --folder https://drive.google.com/drive/folders/11Wtw58MOdnVqiWrbV3dScmxEmvDrlpQG -O $SCRIPT_DIR_PATH/resources/hg19/variant_resources_hg19/1000g_phase3_v4_20130502_sites_hg19

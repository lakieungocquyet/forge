# Overview
Pipeline for calling variants from whole exome sequencing (WES) raw data

This repository contains source code of Forge. The contents
of this repository are 100% open source and released under the GPL-3.0 license (see [LICENSE.TXT](https://github.com/lakieungocquyet/forge/blob/main/LICENSE)).


# Requirements
*   Unix-like operating system (cannot run on Windows)

# Installation

### Step 1: Install [pixi](https://pixi.prefix.dev/latest/)

Pixi is a package and environment management tool. Forge uses Pixi to manage dependencies and tasks.

To install pixi you can run the following command in your terminal:

```
curl -fsSL https://pixi.sh/install.sh | sh
```
If your system doesn't have `curl`, you can use `wget`:

```
wget -qO- https://pixi.sh/install.sh | sh
```

### Step 2: Clone Forge repository from Github

```
git clone https://github.com/lakieungocquyet/forge.git
```

### Step 3: Run installer

```
cd forge && source install.sh
```

# How to use
### 1. Prepare input data
Prepare your Whole Exome Sequencing (WES) raw data (typically FASTQ files). 

Example:

```
home/
└──user/
    └──input/
        ├── sample1/
        │   ├── sample1.R1.fastq.gz
        │   └── sample1.R2.fastq.gz
        └── sample2/
            ├── sample2.R1.fastq.gz
            └── sample2.R2.fastq.gz
```
### 2. Configure input parameters (YAML)

Forge uses a YAML configuration file to define inputs, outputs.

Example: run.yaml
```
# Please don't use tab characters for indentation in this file. Use spaces only.
sample: [
  { 
    id: NF2_01, 
    platform: "illumina", 
    read1: /home/lknq/WES_samples/NF2_01/NF2_01_1.trim.fastq.gz,
    read2: /home/lknq/WES_samples/NF2_01/NF2_01_2.trim.fastq.gz
  },
  { 
    id: RGNC07, 
    platform: "illumina", 
    read1: /home/lknq/WES_samples/RGNC07/RGNC07_1.trim.fastq.gz,
    read2: /home/lknq/WES_samples/RGNC07/RGNC07_2.trim.fastq.gz
  },
  # You can add more samples as needed
  # { 
  #   id: , 
  #   platform: , # platform: (illumina/nanopore/pacbio)
  #   read1: ,
  #   read2: 
  # },
]
```
#### Configuration details

The YAML configuration file includes:

- `sample`: list of samples with metadata and file paths  

Fields:

- `id`: unique sample identifier  
- `platform`: sequencing platform (e.g., illumina)  
- `read1`, `read2`: paths to paired-end FASTQ files  
### 3. Run the variant calling pipeline
Use the following command:
```
forge callvariants \
  -I path/to/your/<config_file_name>.yaml \
  -O path/to/your/output/directory \
  -R path/to/your/<reference_genome>.fa \
  -r path/to/your/<regions>.bed
```

Example:

```
forge callvariants \
  -I /home/lknq/GitHub/forge/example/input.yaml \
  -O /home/lknq/GitHub/forge/results \
  -R /home/lknq/GitHub/forge/resources/hg19/reference_genome_hg19/hg19.p13.plusMT.no_alt_analysis_set.fa \
  -r /home/lknq/GitHub/forge/resources/hg19/regions_hg19/s07604624_hg19/s07604624_covered.bed
```
# All options

```
Available commands:

callvariants:

usage: forge callvariants [-h] -I <YAML> -O <directory> -R <FASTA> [-r <BED>] [--bqsr-known-sites <VCF> [<VCF> ...]] [--annotation-resource <TYPE=VCF> [<TYPE=VCF> ...]] [-t <INT>] [--max-memory <GB>] [--min-memory <GB>]

options:
  -h, --help                                         show this help message and exit
  -I <YAML>, --input <YAML>                          Path to the YAML configuration file (e.g., run.yaml)
  -O <directory>, --output <directory>               Path to the directory where results will be stored (e.g., ~/result/)
  -R <FASTA>, --reference-genome <FASTA>             Reference genome FASTA file (e.g. hg19.fa)
  -r <BED>, --regions <BED>                          Genomic regions to process. Accepts BED file
  --bqsr-known-sites <VCF> [<VCF> ...]               List of known sites for Base Quality Score Recalibration (e.g., dbsnp.vcf.gz mills.vcf.gz)
  --annotation-resource <TYPE=VCF> [<TYPE=VCF> ...]  Annotation resources. Can be used in two forms:
                                                      --annotation-resource dbsnp=1.vcf
                                                      --annotation-resource dbsnp=1.vcf clinvar=2.vcf
                                                     Available types: dbsnp_138, clinvar, dbnsfp, phase1_1000g_indels, esp6500si_v2_ssa137, phase3_1000g_v4_20130502, omni2_5_1000g.
  -t <INT>, --threads <INT>                          Number of threads to use (default: 4)
  --max-memory <GB>                                  Maximum memory in GB (default: 16)
  --min-memory <GB>                                  Minimum memory in GB (default: 8)
```

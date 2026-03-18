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
cd forge && bash install.sh
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
input:
  sample: [
    { 
      id: sample1, 
      platform: "illumina", 
      read1: /home/user/input/sample1/sample1.R1.fastq.gz,
      read2: /home/user/input/sample1/sample1.R2.fastq.gz
    },
    { 
      id: sample2, 
      platform: "illumina", 
      read1: /home/user/input/sample2/sample2.R1.fastq.gz,
      read2: /home/user/input/sample2/sample2.R2.fastq.gz
    },
  ]
output: 
  directory: /home/user/output/
```
#### Configuration details

The YAML configuration file includes:

- `input.sample`: list of samples with metadata and file paths  
- `output.directory`: directory where results will be stored  

Fields:

- `id`: unique sample identifier  
- `platform`: sequencing platform (e.g., illumina)  
- `read1`, `read2`: paths to paired-end FASTQ files  
### 3. Run the pipeline
Use the following command:
```
forge -I path/to/your/<config_file_name>.yaml
```

Example:

```
forge -I /home/user/input/run.yaml
```
# All options

```
usage: forge [-h] -I <file>

Forge: Variant calling pipeline for Whole Exome Sequencing (WES) data

options:
  -h, --help                 show this help message and exit
  -I <file>, --input <file>  path to the YAML configuration file (e.g., run.yaml)
```

FROM ghcr.io/prefix-dev/pixi:latest AS build
RUN pixi global install -e forge_external_tools -c conda-forge -c bioconda \
    fastp=* bwa=* samtools=* gatk4=* bcftools=* snpeff=* snpsift=* \
    t1k=* cnvkit=* \
    "openjdk>=21" \
    jq=* 
RUN pixi global install -e forge_python -c conda-forge -c bioconda \
    python=* \
    pyyaml=* pandas=* xlsxwriter=* seaborn=* cyvcf2=*
RUN pixi global install -e forge_r -c conda-forge -c bioconda \
    r-base=* \
    r-ggplot2=* r-scales=* r-gtable=* r-argparse=* 

FROM ubuntu
WORKDIR /opt/forge
COPY --from=build /root/.pixi /root/.pixi 
COPY main.py forge /opt/forge/
COPY scripts /opt/forge/scripts
COPY src /opt/forge/src
ENV PATH="/opt/forge/:/root/.pixi/bin:$PATH"
RUN chmod +x /opt/forge/forge
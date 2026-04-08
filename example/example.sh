forge workflow call-variants \
    -I /home/lknq/GitHub/forge/example/input.yaml \
    -O /home/lknq/GitHub/forge/results \
    -R ~/resources/generated/reference_genome_hg19/processed/hg19.p13.plusMT.no_alt_analysis_set.fa \
    -r ~/GitHub/forge/resources/hg19/regions_hg19/s07604624_hg19/s07604624_covered.bed \
    --bqsr-known-sites \
        /home/lknq/resources/generated/1000g_phase1_indels_hg19/processed/1000G_phase1.indels.hg19.sites.vcf.bgz \
        /home/lknq/resources/generated/dbsnp_138_hg19/processed/dbsnp_138.hg19.vcf.bgz \
        /home/lknq/resources/generated/1000g_omni2_5_hg19/processed/1000G_omni2.5.hg19.sites.vcf.bgz \
    --annotation-resource \
        dbsnp_138=/home/lknq/resources/generated/dbsnp_138_hg19/processed/dbsnp_138.hg19.vcf.bgz \
        phase1_1000g_indels=/home/lknq/resources/generated/1000g_phase1_indels_hg19/processed/1000G_phase1.indels.hg19.sites.vcf.bgz \
        omni2_5_1000g=/home/lknq/resources/generated/1000g_omni2_5_hg19/processed/1000G_omni2.5.hg19.sites.vcf.bgz \
    --annotation-resource \
        clinvar=/home/lknq/resources/generated/clinvar_20240716_hg19/processed/clinvar_20240716.hg19.vcf.bgz \
        dbnsfp=/home/lknq/resources/generated/dbnsfp4_9a_hg19/processed/dbnsfp4.9a_hg19.txt.bgz \
        esp6500si_v2_ssa137=/home/lknq/resources/generated/esp6500si_v2_ssa137_hg19/processed/esp6500si_v2_ssa137.hg19.vcf.bgz \
        phase3_1000g_v4_20130502=/home/lknq/resources/generated/1000g_phase3_v4_20130502_sites_hg19/processed/1000G_phase3_v4_20130502.sites.hg19.vcf.bgz \
    -t 8 \
    --min-memory 8 \
    --max-memory 20

forge workflow identify-hla-alleles \
    -I ~/GitHub/forge/example/input.yaml \
    -O ~/GitHub/forge/results \
    -t 8
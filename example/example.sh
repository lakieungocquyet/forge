forge callvariants \
    -I ~/GitHub/forge/example/input.yaml \
    -O ~/GitHub/forge/results \
    -R ~/GitHub/forge/resources/hg19/reference_genome_hg19/hg19.p13.plusMT.no_alt_analysis_set.fa \
    -r ~/GitHub/forge/resources/hg19/regions_hg19/s07604624_hg19/s07604624_covered.bed \
    --bqsr-known-sites \
        ~/GitHub/forge/resources/hg19/variant_resources_hg19/1000g_phase1_indels_hg19/1000G_phase1.indels.hg19.sites.vcf.bgz \
        ~/GitHub/forge/resources/hg19/variant_resources_hg19/dbsnp_138_hg19/dbsnp_138.hg19.vcf.bgz \
        ~/GitHub/forge/resources/hg19/variant_resources_hg19/1000g_omni2_5_hg19/1000G_omni2.5.hg19.sites.vcf.bgz \
    --annotation-resource \
        dbsnp_138=~/GitHub/forge/resources/hg19/variant_resources_hg19/dbsnp_138_hg19/dbsnp_138.hg19.vcf.bgz \
        phase1_1000g_indels=~/GitHub/forge/resources/hg19/variant_resources_hg19/1000g_phase1_indels_hg19/1000G_phase1.indels.hg19.sites.vcf.bgz \
        omni2_5_1000g=~/GitHub/forge/resources/hg19/variant_resources_hg19/1000g_omni2_5_hg19/1000G_omni2.5.hg19.sites.vcf.bgz \
    --annotation-resource \
        clinvar=~/GitHub/forge/resources/hg19/variant_resources_hg19/clinvar_20240716_hg19/clinvar_20240716.hg19.vcf.bgz \
        dbnsfp=~/GitHub/forge/resources/hg19/variant_resources_hg19/dbnsfp4_9a_hg19/dbnsfp4.9a_hg19.txt.bgz \
        esp6500si_v2_ssa137=~/GitHub/forge/resources/hg19/variant_resources_hg19/esp6500si_v2_ssa137_hg19/esp6500si_v2_ssa137.hg19.vcf.bgz \
        phase3_1000g_v4_20130502=~/GitHub/forge/resources/hg19/variant_resources_hg19/1000g_phase3_v4_20130502_sites_hg19/1000G_phase3_v4_20130502.sites.hg19.vcf.bgz \
    -t 8 \
    --min-memory 8 \
    --max-memory 20

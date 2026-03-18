SCRIPT_DIR_PATH="$(dirname "$(realpath $0)")"

source "$SCRIPT_DIR_PATH/../../src/utils/setup_logging.sh"

INPUT_SAMPLE_LIST=$(echo "$1" | jq -r ".input_data.input.sample")
OUTPUT_DIR_PATH=$(echo "$1" | jq -r ".input_data.output.directory")



RUNTIME_LOG_FILE_PATH="${SCRIPT_DIR_PATH}/../../log/runtime.log"
MONITORING_LOG_FILE_PATH="${SCRIPT_DIR_PATH}/../../log/monitoring.log"


REFERENCE_GENOME_FILE_PATH="${SCRIPT_DIR_PATH}/../../$(echo "$1" | jq -r ".config_data.resources.hg19.reference_genome")"


G1000_OMNI2_5_FILE_PATH="${SCRIPT_DIR_PATH}/../../$(echo "$1" | jq -r '.config_data.resources.hg19.variant_resources["1000g_omni2_5"]')"
DBNSFP4_9A_FILE_PATH="${SCRIPT_DIR_PATH}/../../$(echo "$1" | jq -r '.config_data.resources.hg19.variant_resources.dbnsfp4_9a')"
DBSNP_138_FILE_PATH="${SCRIPT_DIR_PATH}/../../$(echo "$1" | jq -r '.config_data.resources.hg19.variant_resources.dbsnp_138')"
G1000_PHASE1_INDELS_FILE_PATH="${SCRIPT_DIR_PATH}/../../$(echo "$1" | jq -r '.config_data.resources.hg19.variant_resources["1000g_phase1_indels"]')"
G1000_PHASE3_V4_20130502_FILE_PATH="${SCRIPT_DIR_PATH}/../../$(echo "$1" | jq -r '.config_data.resources.hg19.variant_resources["1000g_phase3_v4_20130502"]')"
CLINVAR_20240716_FILE_PATH="${SCRIPT_DIR_PATH}/../../$(echo "$1" | jq -r '.config_data.resources.hg19.variant_resources.clinvar_20240716')"
ESP6500SI_V2_SSA137_FILE_PATH="${SCRIPT_DIR_PATH}/../../$(echo "$1" | jq -r '.config_data.resources.hg19.variant_resources.esp6500si_v2_ssa137')"

S07604624_REGIONS_FILE_PATH="${SCRIPT_DIR_PATH}/../../$(echo "$1" | jq -r ".config_data.resources.hg19.regions.s07604624")"

THREADS=$(echo "$1" | jq -r ".config_data.compute.threads")
MIN_MEMORY_GB=$(echo "$1" | jq -r ".config_data.compute.min_memory_gb")
MAX_MEMORY_GB=$(echo "$1" | jq -r ".config_data.compute.max_memory_gb")

logger INFO "annotate variants with snpEff"
/usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
    java -Xmx${MAX_MEMORY_GB}g -jar ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpeff-5.4.0c-0/snpEff.jar -v GRCh37.p13 \
        ${OUTPUT_DIR_PATH}/cohort.filtered.norm.vcf \
        > ${OUTPUT_DIR_PATH}/annotation_temp_1.vcf \
2>> ${MONITORING_LOG_FILE_PATH}

logger INFO "annotate variant type"
/usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
    java -Xmx${MAX_MEMORY_GB}g -jar  ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar varType  \
        ${OUTPUT_DIR_PATH}/annotation_temp_1.vcf \
        > ${OUTPUT_DIR_PATH}/annotation_temp_2.vcf \
2>> ${MONITORING_LOG_FILE_PATH}

logger INFO "annotate clinvar"
/usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
    java -Xmx${MAX_MEMORY_GB}g -jar  ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar annotate \
        -noId -name CLINVAR_ \
        ${CLINVAR_20240716_FILE_PATH} \
        ${OUTPUT_DIR_PATH}/annotation_temp_2.vcf \
        > ${OUTPUT_DIR_PATH}/annotation_temp_3.vcf \
2>> ${MONITORING_LOG_FILE_PATH}

logger INFO "annotate 1000g phase3"
/usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
    java -Xmx${MAX_MEMORY_GB}g -jar  ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar annotate \
        -noId -name p3_1000G_ \
        ${G1000_PHASE3_V4_20130502_FILE_PATH} \
        ${OUTPUT_DIR_PATH}/annotation_temp_3.vcf  \
        > ${OUTPUT_DIR_PATH}/annotation_temp_4.vcf \
2>> ${MONITORING_LOG_FILE_PATH}

logger INFO "annotate esp6500"
/usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
    java -Xmx${MAX_MEMORY_GB}g -jar  ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar annotate \
        -noId -name ESP6500_ \
        ${ESP6500SI_V2_SSA137_FILE_PATH} \
        ${OUTPUT_DIR_PATH}/annotation_temp_4.vcf  \
        > ${OUTPUT_DIR_PATH}/annotation_temp_5.vcf \
2>> ${MONITORING_LOG_FILE_PATH}

logger INFO "annotate dbsnp"
/usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
    java -Xmx${MAX_MEMORY_GB}g -jar  ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar annotate \
        -noId -info dbSNP138_ID,dbSNPBuildID \
        -id \
        ${DBSNP_138_FILE_PATH} \
        ${OUTPUT_DIR_PATH}/annotation_temp_5.vcf \
        > ${OUTPUT_DIR_PATH}/annotation_temp_6.vcf \
2>> ${MONITORING_LOG_FILE_PATH}

logger INFO "annotate dbnsfp"
/usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
    java -Xmx${MAX_MEMORY_GB}g -jar  \
        ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar dbnsfp -v -f "" -n \
        -db ${DBNSFP4_9A_FILE_PATH} \
        ${OUTPUT_DIR_PATH}/annotation_temp_6.vcf \
        > ${OUTPUT_DIR_PATH}/annotation_temp_7.vcf \
2>> ${MONITORING_LOG_FILE_PATH}

while read -r sample; do
    sample_id=$(echo "$sample" | jq -r ".id")

    logger INFO "extract variants for $sample_id"
    /usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
        gatk SelectVariants \
            -V ${OUTPUT_DIR_PATH}/annotation_temp_7.vcf \
            -R ${REFERENCE_GENOME_FILE_PATH} \
            --sample-name ${sample_id} \
            --exclude-non-variants \
            -O ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.vcf \
    2>> ${MONITORING_LOG_FILE_PATH}

    logger INFO "generate xlsx report $sample_id"
    python3 "${SCRIPT_DIR_PATH}/../python/generate_xlsx_report.py" \
        -I ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.vcf \
        -O ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.xlsx
        
done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')
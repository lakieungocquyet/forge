SCRIPT_DIR_PATH="$(dirname "$(realpath $0)")"

source "$SCRIPT_DIR_PATH/../../src/utils/setup_logging.sh"

cyan_color="\e[36m"  # cyan
green_color="\e[32m"   # green
yellow_color="\e[33m" # yellow
red_color="\e[31m"   # red
reset="\e[0m"

INPUT_SAMPLE_LIST=$(echo "$1" | jq -r ".input_data.sample")
OUTPUT_DIR_PATH=$(echo "$1" | jq -r ".output_dir_path")



mkdir -p $OUTPUT_DIR_PATH/log
RUNTIME_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/runtime.log"
MONITORING_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/monitoring.log"


REFERENCE_GENOME_FILE_PATH="$(echo "$1" | jq -r ".config_data.resources.reference_genome_file_path")"


OMNI2_5_1000G_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.omni2_5_1000g')"
DBNSFP_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.dbnsfp')"
DBSNP_138_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.dbsnp_138')"
PHASE1_1000G_INDELS_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.phase1_1000g_indels')"
PHASE3_1000G_V4_20130502_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.phase3_1000g_v4_20130502')"
CLINVAR_20240716_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.clinvar')"
ESP6500SI_V2_SSA137_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.esp6500si_v2_ssa137')"

REGIONS_FILE_PATH="$(echo "$1" | jq -r ".config_data.resources.regions_file_path")"

THREADS=$(echo "$1" | jq -r ".config_data.compute.threads")
MIN_MEMORY_GB=$(echo "$1" | jq -r ".config_data.compute.min_memory_gb")
MAX_MEMORY_GB=$(echo "$1" | jq -r ".config_data.compute.max_memory_gb")


sample_ids=$(echo "$INPUT_SAMPLE_LIST" | jq -r '.[].id' | paste -sd ", " -)
logger INFO "Annotate variants with genomic information for samples: ${green_color}${sample_ids}${reset}"
/usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
    java -Xmx${MAX_MEMORY_GB}g -jar ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpeff-5.4.0c-0/snpEff.jar -noStats -v GRCh37.p13 \
        ${OUTPUT_DIR_PATH}/cohort.filtered.norm.vcf \
        > ${OUTPUT_DIR_PATH}/annotation_temp_1.vcf \
2>> ${MONITORING_LOG_FILE_PATH}

logger INFO "Annotate variants with variant type for samples: ${green_color}${sample_ids}${reset}"
/usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
    java -Xmx${MAX_MEMORY_GB}g -jar  ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar varType  \
        ${OUTPUT_DIR_PATH}/annotation_temp_1.vcf \
        > ${OUTPUT_DIR_PATH}/annotation_temp_2.vcf \
2>> ${MONITORING_LOG_FILE_PATH}

if [ -f "$CLINVAR_FILE_PATH" ]; then
    logger INFO "Annotate variants with ClinVar database for samples: ${green_color}${sample_ids}${reset}"
    /usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
        java -Xmx${MAX_MEMORY_GB}g -jar  ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar annotate \
            -noId -name CLINVAR_ \
            ${CLINVAR_FILE_PATH} \
            ${OUTPUT_DIR_PATH}/annotation_temp_2.vcf \
            > ${OUTPUT_DIR_PATH}/annotation_temp_3.vcf \
    2>> ${MONITORING_LOG_FILE_PATH}
else
    logger WARNING "Skip clinvar annotation (file not found)"
    cp "${OUTPUT_DIR_PATH}/annotation_temp_2.vcf" "${OUTPUT_DIR_PATH}/annotation_temp_3.vcf"
fi

if [ -f "$PHASE3_1000G_V4_20130502_FILE_PATH" ]; then
    logger INFO "Annotate variants with 1000g phase3 database for samples: ${green_color}${sample_ids}${reset}"
    /usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
        java -Xmx${MAX_MEMORY_GB}g -jar  ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar annotate \
            -noId -name p3_1000G_ \
            ${PHASE3_1000G_V4_20130502_FILE_PATH} \
            ${OUTPUT_DIR_PATH}/annotation_temp_3.vcf  \
            > ${OUTPUT_DIR_PATH}/annotation_temp_4.vcf \
    2>> ${MONITORING_LOG_FILE_PATH}
else
    logger WARNING "Skip 1000g phase3 annotation (file not found)"
    cp "${OUTPUT_DIR_PATH}/annotation_temp_3.vcf" "${OUTPUT_DIR_PATH}/annotation_temp_4.vcf"
fi

if [ -f "$ESP6500SI_V2_SSA137_FILE_PATH" ]; then
    logger INFO "Annotate variants with ESP6500 database for samples: ${green_color}${sample_ids}${reset}"
    /usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
        java -Xmx${MAX_MEMORY_GB}g -jar  ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar annotate \
            -noId -name ESP6500_ \
            ${ESP6500SI_V2_SSA137_FILE_PATH} \
            ${OUTPUT_DIR_PATH}/annotation_temp_4.vcf  \
            > ${OUTPUT_DIR_PATH}/annotation_temp_5.vcf \
    2>> ${MONITORING_LOG_FILE_PATH}
else
    logger WARNING "Skip esp6500 annotation (file not found)"
    cp "${OUTPUT_DIR_PATH}/annotation_temp_4.vcf" "${OUTPUT_DIR_PATH}/annotation_temp_5.vcf"
fi

if [ -f "$DBSNP_138_FILE_PATH" ]; then
    logger INFO "Annotate variants with dbSNP 138 database for samples: ${green_color}${sample_ids}${reset}"
    /usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
        java -Xmx${MAX_MEMORY_GB}g -jar  ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar annotate \
            -noId -info dbSNP138_ID,dbSNPBuildID \
            -id \
            ${DBSNP_138_FILE_PATH} \
            ${OUTPUT_DIR_PATH}/annotation_temp_5.vcf \
            > ${OUTPUT_DIR_PATH}/annotation_temp_6.vcf \
    2>> ${MONITORING_LOG_FILE_PATH}
else
    logger WARNING "Skip dbSNP138 annotation (file not found)"
    cp "${OUTPUT_DIR_PATH}/annotation_temp_5.vcf" "${OUTPUT_DIR_PATH}/annotation_temp_6.vcf"
fi

if [ -f "$DBNSFP_FILE_PATH" ]; then
    logger INFO "Annotate variants with dbNSFP database for samples: ${green_color}${sample_ids}${reset}"
    /usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
        java -Xmx${MAX_MEMORY_GB}g -jar  \
            ${SCRIPT_DIR_PATH}/../../.pixi/envs/forge/share/snpsift-5.4.0c-0/SnpSift.jar dbnsfp -v -f "" -n \
            -db ${DBNSFP_FILE_PATH} \
            ${OUTPUT_DIR_PATH}/annotation_temp_6.vcf \
            > ${OUTPUT_DIR_PATH}/annotation_temp_7.vcf \
    2>> ${MONITORING_LOG_FILE_PATH}
else
    logger WARNING "Skip dbNSFP annotation (file not found)"
    cp "${OUTPUT_DIR_PATH}/annotation_temp_6.vcf" "${OUTPUT_DIR_PATH}/annotation_temp_7.vcf"
fi

while read -r sample; do
    sample_id=$(echo "$sample" | jq -r ".id")

    logger INFO "Extract variants for ${green_color}$sample_id${reset}"
    /usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
        gatk SelectVariants \
            -V ${OUTPUT_DIR_PATH}/annotation_temp_7.vcf \
            -R ${REFERENCE_GENOME_FILE_PATH} \
            --sample-name ${sample_id} \
            --exclude-non-variants \
            -O ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.vcf \
    2>> ${MONITORING_LOG_FILE_PATH}

    logger INFO "Generate XLSX report for ${green_color}$sample_id${reset}"
    python3 "${SCRIPT_DIR_PATH}/../python/generate_xlsx_report.py" \
        -I ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.vcf \
        -O ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.xlsx
        
done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')
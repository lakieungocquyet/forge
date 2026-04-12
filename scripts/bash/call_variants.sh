# set -Eeuo pipefail

cyan_color="\e[36m"  # cyan
green_color="\e[32m"   # green
yellow_color="\e[33m" # yellow
red_color="\e[31m"   # red
reset="\e[0m"

SCRIPT_DIR_PATH="$(dirname "$(realpath $0)")"

source "$SCRIPT_DIR_PATH/../../src/bash/utils/setup_logging.sh"
source "$SCRIPT_DIR_PATH/../../src/bash/utils/render_monitoring_window.sh"
source "$SCRIPT_DIR_PATH/../../src/bash/utils/run_command_with_monitoring.sh"

INPUT_SAMPLE_LIST=$(echo "$1" | jq -r ".input_data.sample")
OUTPUT_DIR_PATH=$(echo "$1" | jq -r ".output_dir_path")

REFERENCE_GENOME_FILE_PATH="$(echo "$1" | jq -r ".config_data.resources.reference_genome_file_path")"

OMNI2_5_1000G_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.omni2_5_1000g')"
DBNSFP_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.dbnsfp')"
DBSNP_138_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.dbsnp_138')"
PHASE1_1000G_INDELS_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.phase1_1000g_indels')"
PHASE3_1000G_V4_20130502_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.phase3_1000g_v4_20130502')"
CLINVAR_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.clinvar')"
ESP6500SI_V2_SSA137_FILE_PATH="$(echo "$1" | jq -r '.config_data.resources.annotation_resource_dict.esp6500si_v2_ssa137')"

REGIONS_FILE_PATH="$(echo "$1" | jq -r ".config_data.resources.regions_file_path")"

mapfile -t BQSR_KNOWN_SITES < <(
    echo "$1" | jq -r ".config_data.resources.bqsr_known_sites[]?" 2>/dev/null
)
BQSR_FLAGS=()
for site in "${BQSR_KNOWN_SITES[@]}"; do
    [ -f "$site" ] && BQSR_FLAGS+=(--known-sites "$site")
done

# echo "${BQSR_FLAGS[@]}"

mkdir -p $OUTPUT_DIR_PATH/log
RUNTIME_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/runtime.log"
MONITORING_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/monitoring.log"
MONITORING_STREAM_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/.monitoring.stream"

WORKFLOW_STATUS_FILE_PATH="$OUTPUT_DIR_PATH/log/workflow.status"
WORKFLOW_PROGRESS_FILE_PATH="$OUTPUT_DIR_PATH/log/workflow.progress"


init_workflow_status_file() {
    local status_file="$1"

    local steps=(
        "Map and align"
        "Mark duplicates"
        "Recalibrate base quality"
        "Call variants"
        "Annotate variants"
        "Generade reports"
    )

    : > "$status_file"

    local total=${#steps[@]}
    for i in "${!steps[@]}"; do
        printf "[%d/%d]|%s|PENDING\n" \
            "$((i+1))" "$total" "${steps[$i]}" >> "$status_file"
    done
}

init_workflow_progress_file() {
    local progress_file="$1"
    local initial_title="${2:-Initializing workflow...}"

    mkdir -p "$(dirname "$progress_file")"
    printf "%s\n" "$initial_title" > "$progress_file"
}

update_workflow_status_file() {
    local status_file="$1"
    local step_name="$2"
    local new_status="$3"

    awk -F'|' -v step="$step_name" -v status="$new_status" '
        BEGIN { OFS="|" }
        $2 == step { $3 = status }
        { print }
    ' "$status_file" > "${status_file}.tmp"

    mv "${status_file}.tmp" "$status_file"
}

append_workflow_progress_step() {
    local progress_file="$1"
    local title="$2"
    printf "%s\n" "$title" >> "$progress_file"
}

THREADS=$(echo "$1" | jq -r ".config_data.compute.threads")
MIN_MEMORY_GB=$(echo "$1" | jq -r ".config_data.compute.min_memory_gb")
MAX_MEMORY_GB=$(echo "$1" | jq -r ".config_data.compute.max_memory_gb")

GVCF_COMBINE_FLAGS=()

# echo "$REFERENCE_GENOME_FILE_PATH"

# echo "$OMNI2_5_1000G_FILE_PATH"
# echo "$DBNSFP_FILE_PATH"
# echo "$DBSNP_138_FILE_PATH"
# echo "$PHASE1_1000G_INDELS_FILE_PATH"
# echo "$PHASE3_1000G_V4_20130502_FILE_PATH"
# echo "$CLINVAR_FILE_PATH"
# echo "$ESP6500SI_V2_SSA137_FILE_PATH"

# echo "$REGIONS_FILE_PATH"

# echo "$BQSR_FLAGS"

call_variants_script() {
    init_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH"
    
    init_workflow_progress_file "$WORKFLOW_PROGRESS_FILE_PATH"
    #====================================================================================================#
    #                                     SECONDARY DATA ANALYSIS                                        #
    #====================================================================================================#
    while read -r sample; do
        # Extract sample metadata for the workflow
        sample_id=$(echo "$sample" | jq -r ".id")

        mkdir -p ${OUTPUT_DIR_PATH}/${sample_id} # Create a subdirectory for each sample inside the output directory
        GVCF_COMBINE_FLAGS+=(
            -V "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.g.vcf"
        )
    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')

    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Map and align" "RUNNING"

    while read -r sample; do
        # Extract sample metadata for the workflow
        sample_id=$(echo "$sample" | jq -r ".id")
        sample_platform=$(echo "$sample" | jq -r ".platform")
        sample_read1=$(echo "$sample" | jq -r ".read1")
        sample_read2=$(echo "$sample" | jq -r ".read2")

        # Mapping and alignment
        logger INFO $RUNTIME_LOG_FILE_PATH "Map and align ${green_color}$sample_id${reset} reads to reference genome"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Map and align ${green_color}$sample_id${reset} reads to reference genome"
        : > "$MONITORING_STREAM_LOG_FILE_PATH"
        map_and_align_command="
            bwa mem -t ${THREADS} \
            -R \"@RG\tID:${sample_id}\tLB:lib1\tPL:${sample_platform}\tPU:unit1\tSM:${sample_id}\" \
            \"${REFERENCE_GENOME_FILE_PATH}\" \
            \"${sample_read1}\" \
            \"${sample_read2}\" | \
            samtools sort -@ 8 -o \"${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.bam\"
        "
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" bash -c "
                bwa mem -t ${THREADS} \
                    -R \"@RG\tID:${sample_id}\tLB:lib1\tPL:${sample_platform}\tPU:unit1\tSM:${sample_id}\" \
                    \"${REFERENCE_GENOME_FILE_PATH}\" \
                    \"${sample_read1}\" \
                    \"${sample_read2}\" | \
                samtools sort -@ 8 -o \"${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.bam\"
            "
    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')

    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Map and align" "DONE"
    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Mark duplicates" "RUNNING"

    while read -r sample; do
        # Extract sample metadata for the workflow
        sample_id=$(echo "$sample" | jq -r ".id")

        # Mark duplicate reads
        logger INFO $RUNTIME_LOG_FILE_PATH "Mark duplicate reads in ${green_color}$sample_id${reset} BAM file"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Mark duplicate reads in ${green_color}$sample_id${reset} BAM file"
        : > "$MONITORING_STREAM_LOG_FILE_PATH"
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
            gatk MarkDuplicates \
                -I "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.bam" \
                -O "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam" \
                -M "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.output.metrics.txt"

    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')

    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Mark duplicates" "DONE"
    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Recalibrate base quality" "RUNNING"

    while read -r sample; do
        # Extract sample metadata for the workflow
        sample_id=$(echo "$sample" | jq -r ".id")

        # Recalibrate base quality and apply BQSR
        if [ ${#BQSR_FLAGS[@]} -eq 0 ]; then
            logger WARNING $RUNTIME_LOG_FILE_PATH "Skip recalibrate base quality for ${green_color}$sample_id${reset} (no BQSR known sites provided)"
            cp "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam" \
                "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.recal.bam"
        else
            logger INFO $RUNTIME_LOG_FILE_PATH "Recalibrate base quality for ${green_color}$sample_id${reset}"
            append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Recalibrate base quality for ${green_color}$sample_id${reset}"
            : > "$MONITORING_STREAM_LOG_FILE_PATH"
            /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
                gatk BaseRecalibrator \
                    -I ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam \
                    -R ${REFERENCE_GENOME_FILE_PATH} \
                    ${BQSR_FLAGS[@]} \
                    -O ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.recal_data.table

            logger INFO $RUNTIME_LOG_FILE_PATH "Apply BQSR to ${green_color}$sample_id${reset}"
            append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Apply BQSR to ${green_color}$sample_id${reset}"
            : > "$MONITORING_STREAM_LOG_FILE_PATH"
            /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
                gatk ApplyBQSR \
                    -I "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam" \
                    -R "${REFERENCE_GENOME_FILE_PATH}" \
                    --bqsr-recal-file "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.recal_data.table" \
                    -O "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.recal.bam"
        fi
    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')

    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Recalibrate base quality" "DONE"
    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Call variants" "RUNNING"

    while read -r sample; do
        # Extract sample metadata for the workflow
        sample_id=$(echo "$sample" | jq -r ".id")

        # Call variants
        logger INFO $RUNTIME_LOG_FILE_PATH "Call variants (GVCF) for ${green_color}$sample_id${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Call variants (GVCF) for ${green_color}$sample_id${reset}"
        : > "$MONITORING_STREAM_LOG_FILE_PATH"
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
            gatk HaplotypeCaller \
                -I "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.recal.bam" \
                -R "${REFERENCE_GENOME_FILE_PATH}" \
                -O "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.g.vcf" \
                --native-pair-hmm-threads ${THREADS} \
                -ERC GVCF \
                -L "${REGIONS_FILE_PATH}" \
                -ip 100 \
                --use-posteriors-to-calculate-qual false \
                --dont-use-dragstr-priors false \
                --use-new-qual-calculator true \
                --annotate-with-num-discovered-alleles false \
                --heterozygosity 0.001 \
                --indel-heterozygosity 1.25E-4 \
                --heterozygosity-stdev 0.01 \
                --standard-min-confidence-threshold-for-calling 30.0 \
                --max-alternate-alleles 6 \
                --max-genotype-count 1024 \
                --sample-ploidy 2 \
                --num-reference-samples-if-no-call 0 \
                --genotype-assignment-method USE_PLS_TO_ASSIGN \
                --contamination-fraction-to-filter 0.0 \
                --output-mode EMIT_VARIANTS_ONLY \
                --minimum-mapping-quality 20 \
                --base-quality-score-threshold 18 \
                --pcr-indel-model CONSERVATIVE \
                --likelihood-calculation-engine PairHMM \
                --gvcf-gq-bands 1 --gvcf-gq-bands 2 --gvcf-gq-bands 3 --gvcf-gq-bands 4 \
                --gvcf-gq-bands 5 --gvcf-gq-bands 6 --gvcf-gq-bands 7 --gvcf-gq-bands 8 \
                --gvcf-gq-bands 9 --gvcf-gq-bands 10 --gvcf-gq-bands 11 --gvcf-gq-bands 12 \
                --gvcf-gq-bands 13 --gvcf-gq-bands 14 --gvcf-gq-bands 15 --gvcf-gq-bands 16 \
                --gvcf-gq-bands 17 --gvcf-gq-bands 18 --gvcf-gq-bands 19 --gvcf-gq-bands 20 \
                --gvcf-gq-bands 21 --gvcf-gq-bands 22 --gvcf-gq-bands 23 --gvcf-gq-bands 24 \
                --gvcf-gq-bands 25 --gvcf-gq-bands 26 --gvcf-gq-bands 27 --gvcf-gq-bands 28 \
                --gvcf-gq-bands 29 --gvcf-gq-bands 30 --gvcf-gq-bands 31 --gvcf-gq-bands 32 \
                --gvcf-gq-bands 33 --gvcf-gq-bands 34 --gvcf-gq-bands 35 --gvcf-gq-bands 36 \
                --gvcf-gq-bands 37 --gvcf-gq-bands 38 --gvcf-gq-bands 39 --gvcf-gq-bands 40 \
                --gvcf-gq-bands 41 --gvcf-gq-bands 42 --gvcf-gq-bands 43 --gvcf-gq-bands 44 \
                --gvcf-gq-bands 45 --gvcf-gq-bands 46 --gvcf-gq-bands 47 --gvcf-gq-bands 48 \
                --gvcf-gq-bands 49 --gvcf-gq-bands 50 --gvcf-gq-bands 51 --gvcf-gq-bands 52 \
                --gvcf-gq-bands 53 --gvcf-gq-bands 54 --gvcf-gq-bands 55 --gvcf-gq-bands 56 \
                --gvcf-gq-bands 57 --gvcf-gq-bands 58 --gvcf-gq-bands 59 --gvcf-gq-bands 60 \
                --gvcf-gq-bands 70 --gvcf-gq-bands 80 --gvcf-gq-bands 90 --gvcf-gq-bands 99 \
                --read-validation-stringency SILENT \
                --verbosity INFO
    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')

    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Call variants" "DONE"
    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Annotate variants" "RUNNING"
    
    sample_ids=$(echo "$INPUT_SAMPLE_LIST" | jq -r '.[].id' | paste -sd ", " -)

    # Combining GVCF files
    logger INFO $RUNTIME_LOG_FILE_PATH "Combining GVCF files for samples: ${green_color}${sample_ids}${reset}" 
    append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Combining GVCF files for samples: ${green_color}${sample_ids}${reset}" 
    : > "$MONITORING_STREAM_LOG_FILE_PATH"
    /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
        gatk CombineGVCFs \
            -R "${REFERENCE_GENOME_FILE_PATH}" \
            "${GVCF_COMBINE_FLAGS[@]}" \
            -O "${OUTPUT_DIR_PATH}/cohort.g.vcf"

    # Genotype combined GVCF
    logger INFO $RUNTIME_LOG_FILE_PATH "Genotype combined GVCF for samples: ${green_color}${sample_ids}${reset}"
    append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Genotype combined GVCF for samples: ${green_color}${sample_ids}${reset}"
    : > "$MONITORING_STREAM_LOG_FILE_PATH"
    /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
        gatk GenotypeGVCFs \
            -R "${REFERENCE_GENOME_FILE_PATH}" \
            -V "${OUTPUT_DIR_PATH}/cohort.g.vcf" \
            -O "${OUTPUT_DIR_PATH}/cohort.vcf" \
            -L "${REGIONS_FILE_PATH}" \
            -ip 100 \
            --include-non-variant-sites false \
            --merge-input-intervals false \
            --input-is-somatic false \
            --tumor-lod-to-emit 3.5 \
            --allele-fraction-error 0.001 \
            --keep-combined-raw-annotations false \
            --use-posteriors-to-calculate-qual false \
            --use-new-qual-calculator true \
            --standard-min-confidence-threshold-for-calling 30.0 \
            --max-alternate-alleles 6 \
            --sample-ploidy 2 \
            --genotype-assignment-method USE_PLS_TO_ASSIGN \
            --call-genotypes false \
            --interval-set-rule UNION \
            --interval-merging-rule ALL \
            --read-validation-stringency SILENT \
            --verbosity INFO

    # Filter variants
    logger INFO $RUNTIME_LOG_FILE_PATH "Filter variants for samples: ${green_color}${sample_ids}${reset}"
    append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Filter variants for samples: ${green_color}${sample_ids}${reset}"
    : > "$MONITORING_STREAM_LOG_FILE_PATH"
    /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
        gatk VariantFiltration \
            -R "${REFERENCE_GENOME_FILE_PATH}" \
            -V "${OUTPUT_DIR_PATH}/cohort.vcf" \
            --filter-expression 'vc.isSNP() && (QD < 2.0 || FS > 60.0 || MQ < 40.0 || MQRankSum < -12.5 || ReadPosRankSum < -8.0 || SOR > 3.0)' \
            --filter-name "MG_SNP_Filter" \
            --filter-expression 'vc.isIndel() && (QD < 2.0 || FS > 200.0 || ReadPosRankSum < -20.0)' \
            --filter-name "MG_INDEL_Filter" \
            -O "${OUTPUT_DIR_PATH}/cohort.filtered.vcf"

    # Normalize combined VCF
    logger INFO $RUNTIME_LOG_FILE_PATH "Normalizing combined VCF for samples: ${green_color}${sample_ids}${reset}"
    append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Normalizing combined VCF for samples: ${green_color}${sample_ids}${reset}"
    : > "$MONITORING_STREAM_LOG_FILE_PATH"
    /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
        bcftools norm -Ov -m-any \
            --multi-overlaps . \
            "${OUTPUT_DIR_PATH}/cohort.filtered.vcf" \
            -o "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.vcf"

    #====================================================================================================#
    #                                     TERTIARY DATA ANALYSIS                                         #
    #====================================================================================================#


    sample_ids=$(echo "$INPUT_SAMPLE_LIST" | jq -r '.[].id' | paste -sd ", " -)

    # Annotate variants with genomic information
    logger INFO $RUNTIME_LOG_FILE_PATH "Annotate variants with genomic information for samples: ${green_color}${sample_ids}${reset}"
    append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Annotate variants with genomic information for samples: ${green_color}${sample_ids}${reset}"
    : > "$MONITORING_STREAM_LOG_FILE_PATH"
    /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
        snpEff -Xmx${MAX_MEMORY_GB}g -noStats -v GRCh37.p13 \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.vcf" \
            > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_001.vcf"

    # Annotate variants with variant type
    logger INFO $RUNTIME_LOG_FILE_PATH "Annotate variants with variant type for samples: ${green_color}${sample_ids}${reset}"
    append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Annotate variants with variant type for samples: ${green_color}${sample_ids}${reset}"
    : > "$MONITORING_STREAM_LOG_FILE_PATH"
    /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
        SnpSift -Xmx${MAX_MEMORY_GB}g varType \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_001.vcf" \
            > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_002.vcf"

    # Annotate variants with ClinVar database
    if [ -f "$CLINVAR_FILE_PATH" ]; then
        logger INFO $RUNTIME_LOG_FILE_PATH "Annotate variants with ClinVar database for samples: ${green_color}${sample_ids}${reset}"  
        append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Annotate variants with ClinVar database for samples: ${green_color}${sample_ids}${reset}"
        : > "$MONITORING_STREAM_LOG_FILE_PATH"
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
            SnpSift -Xmx${MAX_MEMORY_GB}g annotate \
                -noId -name CLINVAR_ \
                "${CLINVAR_FILE_PATH}" \
                "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_002.vcf" \
                > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_003.vcf"
    else
        logger WARNING $RUNTIME_LOG_FILE_PATH "Skip variants annotation with ClinVar database (ClinVar database file not provided)"
        cp "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_002.vcf" \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_003.vcf"
    fi

    # Annotate variants with 1000G phase3 database
    if [ -f "$PHASE3_1000G_V4_20130502_FILE_PATH" ]; then
        logger INFO $RUNTIME_LOG_FILE_PATH "Annotate variants with 1000G phase3 database for samples: ${green_color}${sample_ids}${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Annotate variants with 1000G phase3 database for samples: ${green_color}${sample_ids}${reset}"
        : > "$MONITORING_STREAM_LOG_FILE_PATH"
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
            SnpSift -Xmx${MAX_MEMORY_GB}g annotate \
                -noId -name p3_1000G_ \
                "${PHASE3_1000G_V4_20130502_FILE_PATH}" \
                "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_003.vcf"  \
                > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_004.vcf"
    else
        logger WARNING $RUNTIME_LOG_FILE_PATH "Skip variants annotation with 1000G phase3 database (1000G phase3 database file not provided)"
        cp "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_003.vcf" \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_004.vcf"
    fi

    # Annotate variants with ESP6500 database
    if [ -f "$ESP6500SI_V2_SSA137_FILE_PATH" ]; then
        logger INFO $RUNTIME_LOG_FILE_PATH "Annotate variants with ESP6500 database for samples: ${green_color}${sample_ids}${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Annotate variants with ESP6500 database for samples: ${green_color}${sample_ids}${reset}"
        : > "$MONITORING_STREAM_LOG_FILE_PATH"
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
            SnpSift -Xmx${MAX_MEMORY_GB}g annotate \
                -noId -name ESP6500_ \
                "${ESP6500SI_V2_SSA137_FILE_PATH}" \
                "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_004.vcf"  \
                > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_005.vcf"
    else
        logger WARNING $RUNTIME_LOG_FILE_PATH "Skip variants annotation with ESP6500 database (ESP6500 database file not provided)"
        cp "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_004.vcf" \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_005.vcf"
    fi

    # Annotate variants with dbSNP 138
    if [ -f "$DBSNP_138_FILE_PATH" ]; then
        logger INFO $RUNTIME_LOG_FILE_PATH "Annotate variants with dbSNP 138 database for samples: ${green_color}${sample_ids}${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Annotate variants with dbSNP 138 database for samples: ${green_color}${sample_ids}${reset}"
        : > "$MONITORING_STREAM_LOG_FILE_PATH"
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
            SnpSift -Xmx${MAX_MEMORY_GB}g annotate \
                -noId -info dbSNP138_ID,dbSNPBuildID \
                -id \
                "${DBSNP_138_FILE_PATH}" \
                "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_005.vcf" \
                > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_006.vcf"
    else
        logger WARNING $RUNTIME_LOG_FILE_PATH "Skip variants annotation with dbSNP 138 database (dbSNP 138 database file not provided)"
        cp "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_005.vcf" \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_006.vcf"
    fi

    # Annotate variants with dbNSFP database
    if [ -f "$DBNSFP_FILE_PATH" ]; then
        logger INFO $RUNTIME_LOG_FILE_PATH "Annotate variants with dbNSFP database for samples: ${green_color}${sample_ids}${reset}"   
        append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Annotate variants with dbNSFP database for samples: ${green_color}${sample_ids}${reset}"
        : > "$MONITORING_STREAM_LOG_FILE_PATH"
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
            SnpSift -Xmx${MAX_MEMORY_GB}g dbnsfp -v -f '' -n \
                -db "${DBNSFP_FILE_PATH}" \
                "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_006.vcf" \
                > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_007.vcf"
    else
        logger WARNING $RUNTIME_LOG_FILE_PATH "Skip variants annotation with dbNSFP database (dbNSFP database file not provided)"
        cp "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_006.vcf" \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_007.vcf"
    fi

    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Annotate variants" "DONE"
    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Generade reports" "RUNNING"
    while read -r sample; do
        sample_id=$(echo "$sample" | jq -r ".id")

        logger INFO $RUNTIME_LOG_FILE_PATH "Extract variants for ${green_color}$sample_id${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Extract variants for ${green_color}$sample_id${reset}"
        : > "$MONITORING_STREAM_LOG_FILE_PATH"
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
            gatk SelectVariants \
                -V "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_007.vcf" \
                -R "${REFERENCE_GENOME_FILE_PATH}" \
                --sample-name "${sample_id}" \
                --exclude-non-variants \
                -O "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.vcf"

        logger INFO $RUNTIME_LOG_FILE_PATH "Generate SNP and Indel variants XLSX report for ${green_color}$sample_id${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_FILE_PATH" "Generate SNP and Indel variants XLSX report for ${green_color}$sample_id${reset}"
        : > "$MONITORING_STREAM_LOG_FILE_PATH"
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}" \
            python3 "${SCRIPT_DIR_PATH}/../python/generate_snp_and_indel_variants_xlsx_report.py" \
                -I "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.vcf" \
                -O "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.snp_and_indel_variants.xlsx"
    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')
    update_workflow_status_file "$WORKFLOW_STATUS_FILE_PATH" "Generade reports" "DONE"

    rm -f "$MONITORING_STREAM_LOG_FILE_PATH"
}

run_command_with_monitoring \
    "call_variants_script" \
    "CALL VARIANTS WORKFLOW" \
    "$MONITORING_LOG_FILE_PATH" \
    "$MONITORING_STREAM_LOG_FILE_PATH" \
    "$WORKFLOW_STATUS_FILE_PATH" \
    "$WORKFLOW_PROGRESS_FILE_PATH"

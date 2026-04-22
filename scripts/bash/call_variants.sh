# set -Eeuo pipefail
SCRIPT_DIR_PATH="$(dirname "$(realpath $0)")"

source "$SCRIPT_DIR_PATH/../../src/bash/utils/setup_logging.sh"
source "$SCRIPT_DIR_PATH/../../src/bash/utils/render_monitoring_window.sh"
source "$SCRIPT_DIR_PATH/../../src/bash/utils/run_command_with_monitoring.sh"
source "$SCRIPT_DIR_PATH/../../src/bash/utils/init_workflow_status_log_file.sh"
source "$SCRIPT_DIR_PATH/../../src/bash/utils/init_workflow_progress_log_file.sh"
source "$SCRIPT_DIR_PATH/../../src/bash/utils/append_workflow_progress_step.sh"
source "$SCRIPT_DIR_PATH/../../src/bash/utils/update_workflow_status_log_file.sh"
source "$SCRIPT_DIR_PATH/../../src/bash/utils/init_workflow_log_files.sh"

CONTEXT_JSON="$1"

cyan_color="\e[36m"  # cyan
green_color="\e[32m"   # green
yellow_color="\e[33m" # yellow
red_color="\e[31m"   # red
reset="\e[0m"

UTC_TIME=$(date -u +"%Y-%m-%d_%Hh-%Mm-%Ss_UTC")
WORKFLOW_TITLE="workflow_call-variants"

INPUT_SAMPLE_LIST=$(echo "$CONTEXT_JSON" | jq -r ".input_data.sample")
OUTPUT_DIR_PATH=$(echo "$CONTEXT_JSON" | jq -r ".output_dir_path")/"${UTC_TIME}_${WORKFLOW_TITLE}"

REFERENCE_GENOME_FILE_PATH="$(echo "$CONTEXT_JSON" | jq -r ".config_data.resources.reference_genome_file_path")"

DBNSFP_FILE_PATH="$(echo "$CONTEXT_JSON" | jq -r '.config_data.resources.standard_annotation_resources_dict.dbnsfp')"
DBSNP_138_FILE_PATH="$(echo "$CONTEXT_JSON" | jq -r '.config_data.resources.standard_annotation_resources_dict.dbsnp_138')"
PHASE3_1000G_FILE_PATH="$(echo "$CONTEXT_JSON" | jq -r '.config_data.resources.standard_annotation_resources_dict.phase3_1000g')"
CLINVAR_FILE_PATH="$(echo "$CONTEXT_JSON" | jq -r '.config_data.resources.standard_annotation_resources_dict.clinvar')"
ESP6500_FILE_PATH="$(echo "$CONTEXT_JSON" | jq -r '.config_data.resources.standard_annotation_resources_dict.esp6500')"

REGIONS_FILE_PATH="$(echo "$CONTEXT_JSON" | jq -r ".config_data.resources.regions_file_path")"

mapfile -t BQSR_KNOWN_SITES < <(
    echo "$CONTEXT_JSON" | jq -r ".config_data.resources.bqsr_known_sites[]?" 2>/dev/null
)
BQSR_FLAGS=()
for site in "${BQSR_KNOWN_SITES[@]}"; do
    [ -f "$site" ] && BQSR_FLAGS+=(--known-sites "$site")
done

# echo "${BQSR_FLAGS[@]}"

THREADS=$(echo "$CONTEXT_JSON" | jq -r ".config_data.compute.threads")
MIN_MEMORY_GB=$(echo "$CONTEXT_JSON" | jq -r ".config_data.compute.min_memory_gb")
MAX_MEMORY_GB=$(echo "$CONTEXT_JSON" | jq -r ".config_data.compute.max_memory_gb")

GVCF_COMBINE_FLAGS=()

# echo "$REFERENCE_GENOME_FILE_PATH"

# echo "$DBNSFP_FILE_PATH"
# echo "$DBSNP_138_FILE_PATH"
# echo "$PHASE3_1000G_FILE_PATH"
# echo "$CLINVAR_FILE_PATH"
# echo "$ESP6500_FILE_PATH"

# echo "$REGIONS_FILE_PATH"


call_variants_script() {

    #====================================================================================================#
    #                                     SNP AND INDEL VARIANTS                                         #
    #====================================================================================================#

    mkdir -p "$OUTPUT_DIR_PATH"

    jq -n \
        --arg workflow_title "call-variants" \
        --arg UTC_time "$(date -u +"%Y-%m-%d %H:%M:%S")" \
        --arg local_time "$(date +"%Y-%m-%d %H:%M:%S")" \
        --arg UUIDv4 "$(uuidgen -r)" \
        --argjson context "$CONTEXT_JSON" \
        '{
            workflow_title: $workflow_title,
            UTC_time: $UTC_time,
            local_time: $local_time,
            UUIDv4: $UUIDv4,
            context: $context
        }' > "$OUTPUT_DIR_PATH/workflow.metadata.json"

    call_variants_steps=(
        "Map and align"
        "Mark duplicates"
        "Recalibrate base quality"
        "Call variants"
        "Annotate variants"
        "Generate reports"
    )

    init_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "${call_variants_steps[@]}"
    
    init_workflow_progress_log_file "$WORKFLOW_PROGRESS_LOG_FILE_PATH"
    
    #==================================================#
    #              SECONDARY DATA ANALYSIS             #
    #==================================================#
    while read -r sample; do
        # Extract sample metadata for the workflow
        sample_id=$(echo "$sample" | jq -r ".id")

        mkdir -p ${OUTPUT_DIR_PATH}/${sample_id} # Create a subdirectory for each sample inside the output directory
        GVCF_COMBINE_FLAGS+=(
            -V "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.g.vcf"
        )
    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')

    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Map and align" "RUNNING"

    while read -r sample; do
        # Extract sample metadata for the workflow
        sample_id=$(echo "$sample" | jq -r ".id")
        sample_platform=$(echo "$sample" | jq -r ".platform")
        sample_read1=$(echo "$sample" | jq -r ".read1")
        sample_read2=$(echo "$sample" | jq -r ".read2")

        # Mapping and alignment
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Map and align ${green_color}$sample_id${reset} reads to reference genome"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Map and align ${green_color}$sample_id${reset} reads to reference genome"
        
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" bash -c "
                bwa mem -t ${THREADS} \
                    -R \"@RG\tID:${sample_id}\tLB:lib1\tPL:${sample_platform}\tPU:unit1\tSM:${sample_id}\" \
                    \"${REFERENCE_GENOME_FILE_PATH}\" \
                    \"${sample_read1}\" \
                    \"${sample_read2}\" | \
                samtools sort -@ ${THREADS} -o \"${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.bam\"
            "
    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')

    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Map and align" "DONE"
    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Mark duplicates" "RUNNING"

    while read -r sample; do
        # Extract sample metadata for the workflow
        sample_id=$(echo "$sample" | jq -r ".id")

        # Mark duplicate reads
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Mark duplicate reads in ${green_color}$sample_id${reset} BAM file"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Mark duplicate reads in ${green_color}$sample_id${reset} BAM file"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            gatk MarkDuplicates \
                -I "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.bam" \
                -O "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam" \
                -M "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.output.metrics.txt"

    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')

    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Mark duplicates" "DONE"
    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Recalibrate base quality" "RUNNING"

    while read -r sample; do
        # Extract sample metadata for the workflow
        sample_id=$(echo "$sample" | jq -r ".id")

        # Recalibrate base quality and apply BQSR
        if [ ${#BQSR_FLAGS[@]} -eq 0 ]; then
            logger WARNING $WORKFLOW_CONSOLE_LOG_FILE_PATH "Skip recalibrate base quality for ${green_color}$sample_id${reset} (no BQSR known sites provided)"
            cp "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam" \
                "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.bam"
        else
            : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
            logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Recalibrate base quality for ${green_color}$sample_id${reset}"
            append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Recalibrate base quality for ${green_color}$sample_id${reset}"
            /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
                gatk BaseRecalibrator \
                    -I ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam \
                    -R ${REFERENCE_GENOME_FILE_PATH} \
                    ${BQSR_FLAGS[@]} \
                    -O ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.recal_data.table

            : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
            logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Apply BQSR to ${green_color}$sample_id${reset}"
            append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Apply BQSR to ${green_color}$sample_id${reset}"
            /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
                gatk ApplyBQSR \
                    -I "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam" \
                    -R "${REFERENCE_GENOME_FILE_PATH}" \
                    --bqsr-recal-file "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.recal_data.table" \
                    -O "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.recal.bam"
            cp "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.recal.bam" \
                "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.bam"

            samtools index "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.bam"
        fi
    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')

    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Recalibrate base quality" "DONE"
    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Call variants" "RUNNING"

    while read -r sample; do
        # Extract sample metadata for the workflow
        sample_id=$(echo "$sample" | jq -r ".id")

        # Call variants
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Call variants (GVCF) for ${green_color}$sample_id${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Call variants (GVCF) for ${green_color}$sample_id${reset}"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            gatk HaplotypeCaller \
                -I "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.bam" \
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

    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Call variants" "DONE"
    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Annotate variants" "RUNNING"
    
    sample_ids=$(echo "$INPUT_SAMPLE_LIST" | jq -r '.[].id' | paste -sd ", " -)

    # Combining GVCF files
    : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
    logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Combining GVCF files for samples: ${green_color}${sample_ids}${reset}" 
    append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Combining GVCF files for samples: ${green_color}${sample_ids}${reset}" 
    /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
        gatk CombineGVCFs \
            -R "${REFERENCE_GENOME_FILE_PATH}" \
            "${GVCF_COMBINE_FLAGS[@]}" \
            -O "${OUTPUT_DIR_PATH}/cohort.g.vcf"

    # Genotype combined GVCF
    : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
    logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Genotype combined GVCF for samples: ${green_color}${sample_ids}${reset}"
    append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Genotype combined GVCF for samples: ${green_color}${sample_ids}${reset}"
    /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
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
    : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
    logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Filter variants for samples: ${green_color}${sample_ids}${reset}"
    append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Filter variants for samples: ${green_color}${sample_ids}${reset}"
    /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
        gatk VariantFiltration \
            -R "${REFERENCE_GENOME_FILE_PATH}" \
            -V "${OUTPUT_DIR_PATH}/cohort.vcf" \
            --filter-expression 'vc.isSNP() && (QD < 2.0 || FS > 60.0 || MQ < 40.0 || MQRankSum < -12.5 || ReadPosRankSum < -8.0 || SOR > 3.0)' \
            --filter-name "MG_SNP_Filter" \
            --filter-expression 'vc.isIndel() && (QD < 2.0 || FS > 200.0 || ReadPosRankSum < -20.0)' \
            --filter-name "MG_INDEL_Filter" \
            -O "${OUTPUT_DIR_PATH}/cohort.filtered.vcf"

    # Normalize combined VCF
    : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
    logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Normalizing combined VCF for samples: ${green_color}${sample_ids}${reset}"
    append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Normalizing combined VCF for samples: ${green_color}${sample_ids}${reset}"
    /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
        bcftools norm -Ov -m-any \
            --multi-overlaps . \
            "${OUTPUT_DIR_PATH}/cohort.filtered.vcf" \
            -o "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.vcf"

    #==================================================#
    #             TERTIARY DATA ANALYSIS               #
    #==================================================#

    sample_ids=$(echo "$INPUT_SAMPLE_LIST" | jq -r '.[].id' | paste -sd ", " -)

    # Annotate variants with genomic information
    : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
    logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Annotate variants with genomic information for samples: ${green_color}${sample_ids}${reset}"
    append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Annotate variants with genomic information for samples: ${green_color}${sample_ids}${reset}"
    /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
        snpEff -Xmx${MAX_MEMORY_GB}g -noStats -v GRCh37.p13 \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.vcf" \
            > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_001.vcf"

    # Annotate variants with variant type
    : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
    logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Annotate variants with variant type for samples: ${green_color}${sample_ids}${reset}"
    append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Annotate variants with variant type for samples: ${green_color}${sample_ids}${reset}"
    /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
        SnpSift -Xmx${MAX_MEMORY_GB}g varType \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_001.vcf" \
            > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_002.vcf"

    # Annotate variants with ClinVar database
    if [ -f "$CLINVAR_FILE_PATH" ]; then
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Annotate variants with ClinVar database for samples: ${green_color}${sample_ids}${reset}"  
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Annotate variants with ClinVar database for samples: ${green_color}${sample_ids}${reset}"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            SnpSift -Xmx${MAX_MEMORY_GB}g annotate \
                -noId -name CLINVAR_ \
                "${CLINVAR_FILE_PATH}" \
                "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_002.vcf" \
                > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_003.vcf"
    else
        logger WARNING $WORKFLOW_CONSOLE_LOG_FILE_PATH "Skip variants annotation with ClinVar database (ClinVar database file not provided)"
        cp "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_002.vcf" \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_003.vcf"
    fi

    # Annotate variants with 1000G phase3 database
    if [ -f "$PHASE3_1000G_FILE_PATH" ]; then
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Annotate variants with 1000G phase3 database for samples: ${green_color}${sample_ids}${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Annotate variants with 1000G phase3 database for samples: ${green_color}${sample_ids}${reset}"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            SnpSift -Xmx${MAX_MEMORY_GB}g annotate \
                -noId -name p3_1000G_ \
                "${PHASE3_1000G_FILE_PATH}" \
                "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_003.vcf"  \
                > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_004.vcf"
    else
        logger WARNING $WORKFLOW_CONSOLE_LOG_FILE_PATH "Skip variants annotation with 1000G phase3 database (1000G phase3 database file not provided)"
        cp "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_003.vcf" \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_004.vcf"
    fi

    # Annotate variants with ESP6500 database
    if [ -f "$ESP6500_FILE_PATH" ]; then
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Annotate variants with ESP6500 database for samples: ${green_color}${sample_ids}${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Annotate variants with ESP6500 database for samples: ${green_color}${sample_ids}${reset}"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            SnpSift -Xmx${MAX_MEMORY_GB}g annotate \
                -noId -name ESP6500_ \
                "${ESP6500_FILE_PATH}" \
                "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_004.vcf"  \
                > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_005.vcf"
    else
        logger WARNING $WORKFLOW_CONSOLE_LOG_FILE_PATH "Skip variants annotation with ESP6500 database (ESP6500 database file not provided)"
        cp "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_004.vcf" \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_005.vcf"
    fi

    # Annotate variants with dbSNP 138
    if [ -f "$DBSNP_138_FILE_PATH" ]; then
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Annotate variants with dbSNP 138 database for samples: ${green_color}${sample_ids}${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Annotate variants with dbSNP 138 database for samples: ${green_color}${sample_ids}${reset}"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            SnpSift -Xmx${MAX_MEMORY_GB}g annotate \
                -noId -info dbSNP138_ID,dbSNPBuildID \
                -id \
                "${DBSNP_138_FILE_PATH}" \
                "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_005.vcf" \
                > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_006.vcf"
    else
        logger WARNING $WORKFLOW_CONSOLE_LOG_FILE_PATH "Skip variants annotation with dbSNP 138 database (dbSNP 138 database file not provided)"
        cp "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_005.vcf" \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_006.vcf"
    fi

    # Annotate variants with dbNSFP database
    if [ -f "$DBNSFP_FILE_PATH" ]; then
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Annotate variants with dbNSFP database for samples: ${green_color}${sample_ids}${reset}"   
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Annotate variants with dbNSFP database for samples: ${green_color}${sample_ids}${reset}"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            SnpSift -Xmx${MAX_MEMORY_GB}g dbnsfp -v -f '' -n \
                -db "${DBNSFP_FILE_PATH}" \
                "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_006.vcf" \
                > "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_007.vcf"
    else
        logger WARNING $WORKFLOW_CONSOLE_LOG_FILE_PATH "Skip variants annotation with dbNSFP database (dbNSFP database file not provided)"
        cp "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_006.vcf" \
            "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_007.vcf"
    fi

    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Annotate variants" "DONE"
    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Generate reports" "RUNNING"
    while read -r sample; do
        sample_id=$(echo "$sample" | jq -r ".id")
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Extract variants for ${green_color}$sample_id${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Extract variants for ${green_color}$sample_id${reset}"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            gatk SelectVariants \
                -V "${OUTPUT_DIR_PATH}/cohort.filtered.normalized.annotated_temp_007.vcf" \
                -R "${REFERENCE_GENOME_FILE_PATH}" \
                --sample-name "${sample_id}" \
                --exclude-non-variants \
                -O "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.vcf"

        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO $WORKFLOW_CONSOLE_LOG_FILE_PATH "Generate SNP and Indel variants XLSX report for ${green_color}$sample_id${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Generate SNP and Indel variants XLSX report for ${green_color}$sample_id${reset}"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            python3 "${SCRIPT_DIR_PATH}/../python/generate_snp_and_indel_variants_xlsx_report.py" \
                -I "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.final.vcf" \
                -O "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.snp_and_indel_variants.xlsx"
    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')
    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Generate reports" "DONE"

    #====================================================================================================#
    #                                       COPY NUMBER VARIANTS                                         #
    #====================================================================================================#
    rm -f "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
}

init_workflow_log_files "$OUTPUT_DIR_PATH"

run_command_with_monitoring \
    "call_variants_script" \
    "CALL VARIANTS WORKFLOW" \
    "$WORKFLOW_CONSOLE_LOG_FILE_PATH" \
    "$WORKFLOW_CONSOLE_STREAM_FILE_PATH" \
    "$WORKFLOW_STATUS_LOG_FILE_PATH" \
    "$WORKFLOW_PROGRESS_LOG_FILE_PATH" \
    "$WORKFLOW_ERROR_LOG_FILE_PATH"

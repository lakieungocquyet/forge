SCRIPT_DIR_PATH="$(dirname "$(realpath $0)")"

source "$SCRIPT_DIR_PATH/../../src/utils/setup_logging.sh"

INPUT_SAMPLE_LIST=$(echo "$1" | jq -r ".input_data.sample")
OUTPUT_DIR_PATH=$(echo "$1" | jq -r ".output_dir_path")


mapfile -t BQSR_KNOWN_SITES < <(
    echo "$1" | jq -r ".config_data.resources.bqsr_known_sites[]?" 2>/dev/null
)
BQSR_FLAGS=()
for site in "${BQSR_KNOWN_SITES[@]}"; do
    [ -f "$site" ] && BQSR_FLAGS+=(--known-sites "$site")
done

RUNTIME_LOG_FILE_PATH="${SCRIPT_DIR_PATH}/../../log/runtime.log"
MONITORING_LOG_FILE_PATH="${SCRIPT_DIR_PATH}/../../log/monitoring.log"


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

GVCF_FILE_STRING=""

while read -r sample; do
    
    sample_id=$(echo "$sample" | jq -r ".id")
    sample_platform=$(echo "$sample" | jq -r ".platform")
    sample_read1=$(echo "$sample" | jq -r ".read1")
    sample_read2=$(echo "$sample" | jq -r ".read2")

    mkdir -p ${OUTPUT_DIR_PATH}/${sample_id}
    
    GVCF_FILE_STRING+=" -V ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.g.vcf"

    logger INFO "process sample $sample_id"
    logger INFO "map and align $sample_id reads to reference genome"

    /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}"\
        bwa mem -t ${THREADS} \
            -R "@RG\tID:${sample_id}\tLB:lib1\tPL:${sample_platform}\tPU:unit1\tSM:${sample_id}" \
            ${REFERENCE_GENOME_FILE_PATH} \
            ${sample_read1} \
            ${sample_read2} \
        > ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sam \
    2>> "${MONITORING_LOG_FILE_PATH}"

    logger INFO "convert $sample_id SAM file to BAM file"
    /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}"\
        samtools view -@ ${THREADS} -Sb ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sam \
            > ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.bam \
    2>> "${MONITORING_LOG_FILE_PATH}"

    logger INFO "sort $sample_id BAM file"
    /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}"\
        samtools sort -@ ${THREADS} -o ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.bam \
            ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.bam \
    2>> "${MONITORING_LOG_FILE_PATH}"

    logger INFO "mark duplicates $sample_id BAM file"
    /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}"\
        gatk MarkDuplicates \
            -I ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.bam \
            -O ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam \
            -M ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.output.metrics.txt \
    2>> "${MONITORING_LOG_FILE_PATH}"

    if [ ${#BQSR_FLAGS[@]} -eq 0 ]; then
        logger WARN "skip BQSR for $sample_id (no BQSR known sites provided)"

        cp "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam" \
        "${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.recal.bam"

    else
        logger INFO "recalibrate base quality $sample_id BAM file"
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}"\
            gatk BaseRecalibrator \
                -I ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam \
                -R ${REFERENCE_GENOME_FILE_PATH} \
                "${BQSR_FLAGS[@]}" \
                -O ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.recal_data.table \
        2>> "${MONITORING_LOG_FILE_PATH}"

        logger INFO "apply BQSR $sample_id BAM file"
        /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}"\
            gatk ApplyBQSR \
                -I ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.bam \
                -R ${REFERENCE_GENOME_FILE_PATH} \
                --bqsr-recal-file ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.recal_data.table \
                -O ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.recal.bam \
        2>> "${MONITORING_LOG_FILE_PATH}"
    fi


    logger INFO "call variants (GVCF) $sample_id"
    /usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}"\
        gatk HaplotypeCaller \
            -I ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.sorted.marked.recal.bam \
            -R ${REFERENCE_GENOME_FILE_PATH} \
            -O ${OUTPUT_DIR_PATH}/${sample_id}/${sample_id}.g.vcf \
            --native-pair-hmm-threads ${THREADS} \
            -ERC GVCF \
            -L ${REGIONS_FILE_PATH} \
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
            --verbosity INFO \
    2>> "${MONITORING_LOG_FILE_PATH}" 
done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')

logger INFO "combine gvcf files" 
/usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}"\
    gatk CombineGVCFs \
        -R ${REFERENCE_GENOME_FILE_PATH} \
        ${GVCF_FILE_STRING} \
        -O ${OUTPUT_DIR_PATH}/cohort.g.vcf \
2>> "${MONITORING_LOG_FILE_PATH}"

logger INFO "genotype gvcf"
/usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}"\
    gatk GenotypeGVCFs \
        -R ${REFERENCE_GENOME_FILE_PATH} \
        -V ${OUTPUT_DIR_PATH}/cohort.g.vcf \
        -O ${OUTPUT_DIR_PATH}/cohort.vcf \
        -L ${REGIONS_FILE_PATH} \
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
        --verbosity INFO \
2>> "${MONITORING_LOG_FILE_PATH}"

logger INFO "filter variants"
/usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}"\
    gatk VariantFiltration \
        -R ${REFERENCE_GENOME_FILE_PATH} \
        -V ${OUTPUT_DIR_PATH}/cohort.vcf \
        --filter-expression "vc.isSNP() && (QD < 2.0 || FS > 60.0 || MQ < 40.0 || MQRankSum < -12.5 || ReadPosRankSum < -8.0 || SOR > 3.0)" \
        --filter-name "MG_SNP_Filter" \
        --filter-expression "vc.isIndel() && (QD < 2.0 || FS > 200.0 || ReadPosRankSum < -20.0)" \
        --filter-name "MG_INDEL_Filter" \
        -O ${OUTPUT_DIR_PATH}/cohort.filtered.vcf \
2>> "${MONITORING_LOG_FILE_PATH}"

logger INFO "normalize vcf file"
/usr/bin/time -v -a -o "${RUNTIME_LOG_FILE_PATH}"\
    bcftools norm -Ov -m-any \
        --multi-overlaps . \
        ${OUTPUT_DIR_PATH}/cohort.filtered.vcf \
        -o ${OUTPUT_DIR_PATH}/cohort.filtered.norm.vcf \
2>> "${MONITORING_LOG_FILE_PATH}"
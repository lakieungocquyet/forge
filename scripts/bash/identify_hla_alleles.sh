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

INPUT_SAMPLE_LIST=$(echo "$CONTEXT_JSON" | jq -r ".input_data.sample")
OUTPUT_DIR_PATH=$(echo "$CONTEXT_JSON" | jq -r ".output_dir_path")

REFERENCE_HLA_DNA_FILE_PATH="$SCRIPT_DIR_PATH/../../resources/hla/hla_dna_seq.fa"
REFERENCE_HLA_RNA_FILE_PATH="$SCRIPT_DIR_PATH/../../resources/hla/hla_rna_seq.fa"

identify_hla_alleles_script() {

    #==================================================#
    #              WORKFLOW INITIALIZATION             #
    #==================================================#
    mkdir -p "$OUTPUT_DIR_PATH"

    jq -n \
        --arg workflow_title "identify-hla-alleles" \
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

    identify_hla_alleles_steps=(
        "Identify HLA alleles"
    )

    init_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "${identify_hla_alleles_steps[@]}"
    
    init_workflow_progress_log_file "$WORKFLOW_PROGRESS_LOG_FILE_PATH"

    #==================================================#
    #                     HLA TYPING                   #
    #==================================================#
    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Identify HLA alleles" "RUNNING"

    if [[ ! -f "$REFERENCE_HLA_DNA_FILE_PATH" || ! -f "$REFERENCE_HLA_RNA_FILE_PATH" ]]; then
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger WARNING "$WORKFLOW_CONSOLE_LOG_FILE_PATH" "Prepare HLA reference file (file not found)"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Prepare HLA reference file (file not found)"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            t1k-build.pl --download IPD-IMGT/HLA --prefix hla -o "$SCRIPT_DIR_PATH/../../resources"
    fi

    while read -r sample; do 
        sample_id=$(echo "$sample" | jq -r ".id")
        sample_platform=$(echo "$sample" | jq -r ".platform")
        sample_read1=$(echo "$sample" | jq -r ".read1")
        sample_read2=$(echo "$sample" | jq -r ".read2")

        mkdir -p "$OUTPUT_DIR_PATH/$sample_id/"
    
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO "$WORKFLOW_CONSOLE_LOG_FILE_PATH" "Identify HLA alleles in sample ${green_color}$sample_id${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Identify HLA alleles in sample ${green_color}$sample_id${reset}"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            run-t1k --preset hla \
                -1 "$sample_read1" \
                -2 "$sample_read2" \
                -f "$REFERENCE_HLA_DNA_FILE_PATH" \
                -o "$OUTPUT_DIR_PATH/$sample_id/$sample_id"
        
        : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"
        logger INFO "$WORKFLOW_CONSOLE_LOG_FILE_PATH" "Generate HLA typing XLSX report for ${green_color}$sample_id${reset}"
        append_workflow_progress_step "$WORKFLOW_PROGRESS_LOG_FILE_PATH" "Generate HLA typing XLSX report for ${green_color}$sample_id${reset}"
        /usr/bin/time -v -a -o "${WORKFLOW_RUNTIME_LOG_FILE_PATH}" \
            python3 "${SCRIPT_DIR_PATH}/../python/generate_hla_typing_xlsx_report.py" \
                -I "$OUTPUT_DIR_PATH/$sample_id/${sample_id}_genotype.tsv" \
                -O "$OUTPUT_DIR_PATH/$sample_id/${sample_id}.hla_typing.xlsx"
    done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')

    update_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH" "Identify HLA alleles" "DONE"
}

init_workflow_log_files "$OUTPUT_DIR_PATH"

run_command_with_monitoring \
    "identify_hla_alleles_script" \
    "IDENTIFY HLA ALLELES WORKFLOW" \
    "$WORKFLOW_CONSOLE_LOG_FILE_PATH" \
    "$WORKFLOW_CONSOLE_STREAM_FILE_PATH" \
    "$WORKFLOW_STATUS_LOG_FILE_PATH" \
    "$WORKFLOW_PROGRESS_LOG_FILE_PATH" \
    "$WORKFLOW_ERROR_LOG_FILE_PATH"


SCRIPT_DIR_PATH="$(dirname "$(realpath $0)")"

source "$SCRIPT_DIR_PATH/../../src/bash/utils/setup_logging.sh"
source "$SCRIPT_DIR_PATH/../../src/bash/utils/render_monitoring_window.sh"
source "$SCRIPT_DIR_PATH/../../src/bash/utils/run_command_with_monitoring.sh"

cyan_color="\e[36m"  # cyan
green_color="\e[32m"   # green
yellow_color="\e[33m" # yellow
red_color="\e[31m"   # red
reset="\e[0m"

INPUT_SAMPLE_LIST=$(echo "$1" | jq -r ".input_data.sample")
OUTPUT_DIR_PATH=$(echo "$1" | jq -r ".output_dir_path")


mkdir -p "$OUTPUT_DIR_PATH/log"
WORKFLOW_RUNTIME_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/workflow.runtime.log"
WORKFLOW_CONSOLE_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/workflow.console.log"
WORKFLOW_CONSOLE_STREAM_FILE_PATH="$OUTPUT_DIR_PATH/log/.workflow.console.stream"

WORKFLOW_STATUS_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/workflow.status.log"
WORKFLOW_PROGRESS_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/workflow.progress.log"

WORKFLOW_ERROR_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/workflow.error.log"

init_workflow_status_log_file() {
    local status_file="$1"

    local steps=(
        "Identify HLA alleles"
    )

    : > "$status_file"

    local total=${#steps[@]}
    for i in "${!steps[@]}"; do
        printf "[%d/%d]|%s|PENDING\n" \
            "$((i+1))" "$total" "${steps[$i]}" >> "$status_file"
    done
}

init_workflow_progress_log_file() {
    local progress_file="$1"
    local initial_title="${2:-Initializing workflow...}"

    mkdir -p "$(dirname "$progress_file")"
    printf "%s\n" "$initial_title" > "$progress_file"
}

update_workflow_status_log_file() {
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


REFERENCE_HLA_DNA_FILE_PATH="$SCRIPT_DIR_PATH/../../resources/hla/hla_dna_seq.fa"
REFERENCE_HLA_RNA_FILE_PATH="$SCRIPT_DIR_PATH/../../resources/hla/hla_rna_seq.fa"

identify_hla_alleles_script() {
    init_workflow_status_log_file "$WORKFLOW_STATUS_LOG_FILE_PATH"
    init_workflow_progress_log_file "$WORKFLOW_PROGRESS_LOG_FILE_PATH"

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

run_command_with_monitoring \
    "identify_hla_alleles_script" \
    "IDENTIFY HLA ALLELES WORKFLOW" \
    "$WORKFLOW_CONSOLE_LOG_FILE_PATH" \
    "$WORKFLOW_CONSOLE_STREAM_FILE_PATH" \
    "$WORKFLOW_STATUS_LOG_FILE_PATH" \
    "$WORKFLOW_PROGRESS_LOG_FILE_PATH" \
    "$WORKFLOW_ERROR_LOG_FILE_PATH"


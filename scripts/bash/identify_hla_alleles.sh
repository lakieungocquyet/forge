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


mkdir -p $OUTPUT_DIR_PATH/log
RUNTIME_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/runtime.log"
MONITORING_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/monitoring.log"
MONITORING_STREAM_LOG_FILE_PATH="$OUTPUT_DIR_PATH/log/.monitoring_stream"


REFERENCE_HLA_DNA_FILE_PATH="$SCRIPT_DIR_PATH/../../resources/hla/hla_dna_seq.fa"
REFERENCE_HLA_RNA_FILE_PATH="$SCRIPT_DIR_PATH/../../resources/hla/hla_rna_seq.fa"

while read -r sample; do 
    sample_id=$(echo "$sample" | jq -r ".id")
    sample_platform=$(echo "$sample" | jq -r ".platform")
    sample_read1=$(echo "$sample" | jq -r ".read1")
    sample_read2=$(echo "$sample" | jq -r ".read2")

    mkdir -p "$OUTPUT_DIR_PATH/$sample_id/"
    if [[ ! -f "$REFERENCE_HLA_DNA_FILE_PATH" || ! -f "$REFERENCE_HLA_RNA_FILE_PATH" ]]; then
        logger WARNING $MONITORING_LOG_FILE_PATH "Prepare HLA reference file (file not found)"
        t1k-build.pl --download IPD-IMGT/HLA --prefix hla -o "$SCRIPT_DIR_PATH/../../resources"
    else
        logger INFO $MONITORING_LOG_FILE_PATH "Identify HLA alleles in sample ${green_color}$sample_id${reset}"
   
        run_command_with_monitoring "     
            /usr/bin/time -v -a -o ${RUNTIME_LOG_FILE_PATH} \
                run-t1k --preset hla \
                    -1 "$sample_read1" \
                    -2 "$sample_read2" \
                    -f "$REFERENCE_HLA_DNA_FILE_PATH" \
                    -o "$OUTPUT_DIR_PATH/$sample_id/$sample_id"
        " ${MONITORING_LOG_FILE_PATH} ${MONITORING_STREAM_LOG_FILE_PATH} "Identify HLA alleles in sample ${green_color}$sample_id${reset}"

        logger INFO $MONITORING_LOG_FILE_PATH "Generate HLA typing XLSX report for ${green_color}$sample_id${reset}"
        run_command_with_monitoring " 
            python3 "${SCRIPT_DIR_PATH}/../python/generate_hla_typing_xlsx_report.py" \
                -I "$OUTPUT_DIR_PATH/$sample_id/${sample_id}_genotype.tsv" \
                -O "$OUTPUT_DIR_PATH/$sample_id/${sample_id}.hla_typing.xlsx"
        " ${MONITORING_LOG_FILE_PATH} ${MONITORING_STREAM_LOG_FILE_PATH} "Generate HLA typing XLSX report for ${green_color}$sample_id${reset}"
    fi
done < <(echo "$INPUT_SAMPLE_LIST" | jq -c '.[]')
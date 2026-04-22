init_workflow_log_files() {
    local output_dir_path="$1"
    mkdir -p "$output_dir_path/log"

    WORKFLOW_RUNTIME_LOG_FILE_PATH="$output_dir_path/log/workflow.runtime.log"
    WORKFLOW_CONSOLE_LOG_FILE_PATH="$output_dir_path/log/workflow.console.log"
    WORKFLOW_CONSOLE_STREAM_FILE_PATH="$output_dir_path/log/.workflow.console.stream"

    WORKFLOW_STATUS_LOG_FILE_PATH="$output_dir_path/log/workflow.status.log"
    WORKFLOW_PROGRESS_LOG_FILE_PATH="$output_dir_path/log/workflow.progress.log"

    WORKFLOW_ERROR_LOG_FILE_PATH="$output_dir_path/log/workflow.error.log"

    : > "$WORKFLOW_RUNTIME_LOG_FILE_PATH"
    : > "$WORKFLOW_CONSOLE_LOG_FILE_PATH"
    : > "$WORKFLOW_CONSOLE_STREAM_FILE_PATH"

    : > "$WORKFLOW_STATUS_LOG_FILE_PATH"
    : > "$WORKFLOW_PROGRESS_LOG_FILE_PATH"

    : > "$WORKFLOW_ERROR_LOG_FILE_PATH"
}
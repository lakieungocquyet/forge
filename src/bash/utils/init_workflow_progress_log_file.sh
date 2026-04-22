init_workflow_progress_log_file() {
    local progress_file="$1"
    local initial_title="${2:-Initializing workflow...}"

    mkdir -p "$(dirname "$progress_file")"
    printf "%s\n" "$initial_title" > "$progress_file"
}

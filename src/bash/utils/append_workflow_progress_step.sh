append_workflow_progress_step() {
    local progress_file="$1"
    local title="$2"
    printf "%s\n" "$title" >> "$progress_file"
}
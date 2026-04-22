init_workflow_status_log_file() {
    local status_file="$1"
    shift
    local steps=("$@")

    : > "$status_file"

    local total=${#steps[@]}
    for i in "${!steps[@]}"; do
        printf "[%d/%d]|%s|PENDING\n" \
            "$((i+1))" "$total" "${steps[$i]}" >> "$status_file"
    done
}

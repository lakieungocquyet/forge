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
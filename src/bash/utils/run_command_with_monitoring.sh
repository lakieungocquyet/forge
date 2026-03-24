run_command_with_monitoring() {
    local command="$1"
    local log_file="$2"
    local step_name="$3"
    : > "$log_file"

    eval "$command" >> "$log_file" 2>&1 &
    local command_pid=$!

    render_monitoring_window "$log_file" "$step_name" &
    local window_pid=$!
    
    wait $command_pid
    kill $window_pid 2>/dev/null
}
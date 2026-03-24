run_command_with_monitoring() {
    local command="$1"
    local log_file="$2"
    local ui_file="$3"
    local step_name="$4"
    : > "$ui_file"

    # bash -c "$command" </dev/null 2>&1 \
    #     | stdbuf -oL tee -a "$log_file" "$ui_file" >/dev/null &

    # bash -c "$command" </dev/null 2>&1 \
    #     | tee -a "$log_file" "$ui_file" >/dev/null &

    bash -c "$command" 2>&1 \
        | tee -a "$log_file" "$ui_file" >/dev/null &
    local command_pid=$!
    
    local command_pid=$!

    render_monitoring_window "$ui_file" "$step_name" &
    local window_pid=$!
    
    wait $command_pid
    kill $window_pid 2>/dev/null
}
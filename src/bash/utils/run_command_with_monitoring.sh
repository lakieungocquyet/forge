run_command_with_monitoring() {
    local command="$1"
    local log_file="$2"
    local ui_file="$3"
    local step_name="$4"
    : > "$ui_file"

    stdbuf -oL -eL bash -c "$command" 2>&1 \
        |stdbuf -oL tee -a "$log_file" "$ui_file" >/dev/null &

    local command_pid=$!

    render_monitoring_window "$ui_file" "$step_name" &
    local window_pid=$!
    
    while kill -0 $command_pid 2>/dev/null; do
        wait $command_pid 2>/dev/null
    done

    kill $window_pid 2>/dev/null
    wait $window_pid 2>/dev/null

    tput rc
    tput ed 
}
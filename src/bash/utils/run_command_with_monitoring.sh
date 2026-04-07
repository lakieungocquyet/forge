run_command_with_monitoring() {
    local command="$1"
    
    local workflow_tilte="$2"

    local monitoring_file="$3"
    local monitoring_stream_file="$4"
    local workflow_status_file="$5"
    local workflow_progress_file="$6"

    # (
    #     stdbuf -oL -eL "$command"
    # ) 2>&1 | stdbuf -oL tee -a "$monitoring_file" "$monitoring_stream_file" >/dev/null &

    (
        $command
    ) 2>&1 | tee -a "$monitoring_file" "$monitoring_stream_file" >/dev/null &

    local command_pid=$!

    render_monitoring_window \
        "$workflow_tilte" \
        "$monitoring_stream_file" \
        "$workflow_status_file" \
        "$workflow_progress_file" &
    local window_pid=$!
    
    while kill -0 $command_pid 2>/dev/null; do
        wait $command_pid 2>/dev/null
    done

    kill $window_pid 2>/dev/null
    wait $window_pid 2>/dev/null

    tput rc
    tput ed 
}
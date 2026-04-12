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
        set -Eeo pipefail
        handle_error() {
            local exit_code=$?
            {
                printf "\n"
                printf "${red_color}[ERROR]${reset} ────────────────────────────────────────────────"
                printf "${red_color}[ERROR]${reset} File:      %s\n" "${BASH_SOURCE[1]:-$BASH_SOURCE[0]}"
                printf "${red_color}[ERROR]${reset} Function:  %s\n" "${FUNCNAME[1]:-main}"
                printf "${red_color}[ERROR]${reset} Line       %s\n" "${BASH_LINENO[0]}"
                printf "${red_color}[ERROR]${reset} Command:   %s\n" "$(echo "${BASH_COMMAND}" | tr '\n' ' ' | tr -s ' ')"
                printf "${red_color}[ERROR]${reset} Exit code: %s\n" "${exit_code}"
                printf "${red_color}[ERROR]${reset} ────────────────────────────────────────────────"
            } >> "$monitoring_stream_file"
        }
        trap handle_error ERR
        $command
    ) > >(tee -a "$monitoring_file" "$monitoring_stream_file" >/dev/null) 2>&1 &

    local command_pid=$!

    render_monitoring_window \
        "$workflow_tilte" \
        "$monitoring_stream_file" \
        "$workflow_status_file" \
        "$workflow_progress_file" &
    local window_pid=$!

    wait $command_pid 2>/dev/null
    local command_exit_code=$?

    kill $window_pid 2>/dev/null
    wait $window_pid 2>/dev/null
    echo "$command_exit_code"
    if [ $command_exit_code -ne 0 ]; then
        tail -n 8 $monitoring_stream_file
    fi

}
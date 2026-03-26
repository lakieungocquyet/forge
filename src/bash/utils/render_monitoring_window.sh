get_cursor_row() {
    local row col
    if IFS=';' read -t 0.1 -sdR -p $'\e[6n' row col < /dev/tty; then
        echo "${row#*[}"
    else
        echo ""
    fi
}

# anchor_row=$(get_cursor_row)
# echo $anchor_row

cleanup() {
    trap - INT TERM EXIT
    tput cnorm
    tput rmcup 2>/dev/null
    echo -e "\n[!] Exit process!"
    exit 0
}

cleanup_suspend() {
    tput cnorm
    tput rmcup 2>/dev/null
}

resume() {
    tput smcup
    tput clear 
    tput civis
    tput sc
}

trap 'cleanup_suspend; kill -TSTP $$' TSTP # Pause main process
trap 'resume' CONT # Resume main process
trap cleanup INT TERM EXIT # End main process

render_monitoring_window() {
    local file=$1
    local step_name=$2
    local spin='|/-\'
    local s=0

    resized=true
    trap 'resized=true' WINCH # Listen resize in subprocess
    
    tput smcup
    tput clear
    tput civis 
    tput sc

    while true; do
        COLOR_BORDER="\e[33m"
        RESET="\e[0m"

        rows=$(tput lines)
        cols=$(tput cols)

        FIXED_LINES=2
        MONITORING_WINDOW_HEIGHT=$(( $rows - $FIXED_LINES ))
        MONITORING_CONTENT_HEIGHT=$(( $MONITORING_WINDOW_HEIGHT - 2 ))

        inner_width=$((cols - 4))

        if $resized; then
            rows=$(tput lines)
            FIXED_LINES=2
            MONITORING_WINDOW_HEIGHT=$(( $rows - $FIXED_LINES ))
            MONITORING_CONTENT_HEIGHT=$(( $MONITORING_WINDOW_HEIGHT - 2 ))
            tput clear
            resized=false
        fi

        printf '\n'
        printf "[%c] " "${spin:$s:1}"
        printf "Running %b\n" "$step_name"
        s=$(( (s+1) %4 ))

        title=" MONITORING "
        title_len=${#title}
        remaining=$((cols - title_len - 2))
        left=4
        right=$((remaining - left))

        printf "${COLOR_BORDER}╭"

        for ((i=0; i<left; i++)); do printf "─"; done

        printf "%s" "$title"

        for ((i=0; i<right; i++)); do printf "─"; done

        printf "╮${RESET}\n"

        mapfile -t lines < <(tail -n "$MONITORING_CONTENT_HEIGHT" "$file")
        
        for line in "${lines[@]}"; do
            printf "${COLOR_BORDER}│${RESET} %-*.*s ${COLOR_BORDER}│${RESET}\n" "$inner_width" "$inner_width" "$line"
        done
        for ((j=${#lines[@]}; j<MONITORING_CONTENT_HEIGHT; j++)); do
            printf "${COLOR_BORDER}│${RESET} %-*s ${COLOR_BORDER}│${RESET}\n" "$inner_width" ""
        done

        printf "${COLOR_BORDER}╰"

        for ((i=0; i<cols-2; i++)); do printf "─"; done

        printf "╯${RESET}"

        tput rc
        sleep 0.2
    done
    tput rmcup
    tput cnorm  
}



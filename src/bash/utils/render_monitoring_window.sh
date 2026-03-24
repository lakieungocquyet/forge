WINDOW_HEIGHT=10

render_monitoring_window() {
    local file=$1
    local step_name=$2
    local spin='|/-\'
    local i=0

    tput civis 
    tput sc

    while true; do
        COLOR_BORDER="\e[33m"
        RESET="\e[0m"
        cols=$(tput cols)
        inner_width=$((cols - 4))
        printf '\n'
        printf "[%c] " "${spin:$i:1}"
        printf "Running %b\n" "$step_name"
        i=$(( (i+1) %4 ))

        printf "${COLOR_BORDER}+%*s+${RESET}\n" $((cols - 2)) '' | tr ' ' '-'

        mapfile -t lines < <(tail -n $((WINDOW_HEIGHT-2)) "$file")

        for line in "${lines[@]}"; do
            printf "${COLOR_BORDER}|${RESET} %-*.*s ${COLOR_BORDER}|${RESET}\n" "$inner_width" "$inner_width" "$line"
        done
        for ((j=${#lines[@]}; j<WINDOW_HEIGHT-2; j++)); do
            printf "${COLOR_BORDER}|${RESET} %-*s ${COLOR_BORDER}|${RESET}\n" "$inner_width" ""
        done
        printf "${COLOR_BORDER}+%*s+${RESET}\n" $((cols - 2)) '' | tr ' ' '-'
        tput rc
        sleep 0.2
    done
    tput cnorm  
}
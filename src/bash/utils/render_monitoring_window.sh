# get_cursor_row() {
#     local row col
#     if IFS=';' read -t 0.1 -sdR -p $'\e[6n' row col < /dev/tty; then
#         echo "${row#*[}"
#     else
#         echo ""
#     fi
# }

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
trap cleanup INT TERM # End main process

# ----------------------------------------------------------------------------------------------------

render_workflow_status_frame() {
    local cols=$1
    local inner_width=$((cols - 4))
    local visible_slots=$((WORKFLOW_STATUS_FRAME_TOTAL_LINES - 2))
    # --------------------------------------------------
    mapfile -t status_lines < "$workflow_status_file"
    local total=${#status_lines[@]}

    local top_ellipsis=false
    local bottom_ellipsis=false

    (( status_offset > 0 )) && top_ellipsis=true

    $top_ellipsis && ((visible_slots--))

    if (( status_offset + visible_slots < total )); then
        bottom_ellipsis=true
        ((visible_slots--))
    fi
    # --------------------------------------------------
    local title=" WORKFLOW STATUS "
    local title_len=${#title}
    local remaining=$((cols - title_len - 2))
    local left=4
    local right=$((remaining - left))

    printf "${COLOR_BORDER}╭"
    for ((i=0; i<left; i++)); do printf "─"; done
    printf "%s" "$title"
    for ((i=0; i<right; i++)); do printf "─"; done
    printf "╮${RESET}"
    # --------------------------------------------------
    local total_rendered=0
    if $top_ellipsis; then
        printf "${COLOR_BORDER}│${RESET} %-*s ${COLOR_BORDER}│${RESET}\n" "$inner_width" "..."
        ((total_rendered++))
    fi
    # --------------------------------------------------
    for ((i=status_offset; i<status_offset+visible_slots && i<total; i++)); do
        IFS='|' read -r step status <<< "${status_lines[$i]}"

        local badge
        local badge_width=3
        local step_width=$((inner_width - badge_width - 1))

        case "$status" in
            DONE) badge="[✓]" ;;
            RUNNING) badge="[${spin:$s:1}]" ;;
            PENDING) badge="[•]" ;;
            FAILED) badge="[x]" ;;
            *) badge="[$status]" ;;
        esac

        printf "${COLOR_BORDER}│${RESET} %-*s %-3s ${COLOR_BORDER}│${RESET}\n" "$step_width" "$step" "$badge"

        ((total_rendered++))
    done
    # --------------------------------------------------
    if $bottom_ellipsis; then
        printf "${COLOR_BORDER}│${RESET} %-*s ${COLOR_BORDER}│${RESET}\n" "$inner_width" "..."
        ((total_rendered++))
    fi
    # --------------------------------------------------
    for ((j=total_rendered; j<visible_slots; j++)); do
        printf "${COLOR_BORDER}│${RESET} %-*s ${COLOR_BORDER}│${RESET}\n" "$inner_width" ""
    done
    # --------------------------------------------------
    printf "${COLOR_BORDER}╰"
    for ((i=0; i<cols-2; i++)); do printf "─"; done
    printf "╯${RESET}"
}

# ----------------------------------------------------------------------------------------------------

render_current_progress_frame() {
    local cols=$1
    inner_width=$((cols - 4))
    # --------------------------------------------------
    local title=" CURRENT PROGRESS "
    local title_len=${#title}
    local remaining=$((cols - title_len - 2))
    local left=4
    local right=$((remaining - left))

    printf "${COLOR_BORDER}╭"
    for ((i=0; i<left; i++)); do printf "─"; done
    printf "%s" "$title"
    for ((i=0; i<right; i++)); do printf "─"; done
    printf "╮${RESET}"
    # --------------------------------------------------
    current_progress=$(tail -n 1 "$workflow_progress_file")

    printf -v full_line "[%c] Running %b" \
        "${spin:$s:1}" \
        "$current_progress"
    plain_line=$(printf "%b" "$full_line" | sed -E 's/\x1B\[[0-9;]*[mK]//g')
    visible_len=${#plain_line}
    padding=$(( inner_width - visible_len ))
    (( padding < 0 )) && padding=0
    printf "${COLOR_BORDER}│${RESET} %b%*s ${COLOR_BORDER}│${RESET}\n" \
        "$full_line" "$padding" ""
    # --------------------------------------------------
    printf "${COLOR_BORDER}╰"
    for ((i=0; i<cols-2; i++)); do printf "─"; done
    printf "╯${RESET}"
}

# ----------------------------------------------------------------------------------------------------

render_monitoring_frame() {
    local cols=$1

    local inner_width=$((cols - 4))
    local MONITORING_FRAME_TOTAL_LINES=$(( $rows - $WORKFLOW_STATUS_FRAME_TOTAL_LINES - $CURRENT_PROGRESS_FRAME_TOTAL_LINES ))
    local MONITORING_CONTENT_TOTAL_LINES=$(( $MONITORING_FRAME_TOTAL_LINES - 2 ))
    # --------------------------------------------------
    local title=" MONITORING "
    local title_len=${#title}
    local remaining=$((cols - title_len - 2))
    local left=4
    local right=$((remaining - left))

    printf "${COLOR_BORDER}╭"
    for ((i=0; i<left; i++)); do printf "─"; done
    printf "%s" "$title"
    for ((i=0; i<right; i++)); do printf "─"; done
    printf "╮${RESET}"
    # --------------------------------------------------
    mapfile -t lines < <(tail -n "$MONITORING_CONTENT_TOTAL_LINES" "$monitoring_stream_file")
    
    local printed=0

    for line in "${lines[@]}"; do
        local plain 

        # plain=$(printf "%s" "$line" \
        #     | sed -E 's/\x1B\[[0-9;]*[mK]//g')
        plain=$(printf "%s" "$line" \
            | sed -E 's/\x1B\[[0-9;]*[mK]//g' \
            | perl -CS -pe 's/\x{202F}|\x{00A0}/ /g')
            
        local plain_len=${#plain}

        if [[ -z "$plain" ]]; then
            printf "${COLOR_BORDER}│${RESET} %-*s ${COLOR_BORDER}│${RESET}\n" "$inner_width" ""
            ((printed++))
            continue
        fi

        while [[ -n "$plain" && $printed -lt $MONITORING_CONTENT_TOTAL_LINES ]]; do
            local chunk_plain="${plain:0:$inner_width}"

            local chunk="$chunk_plain"

            printf "${COLOR_BORDER}│${RESET} %-*s ${COLOR_BORDER}│${RESET}\n" \
                "$inner_width" "$chunk"

            plain="${plain:$inner_width}"
            ((printed++))
        done

        (( printed >= MONITORING_CONTENT_TOTAL_LINES )) && break
    done

    for ((j=printed; j<MONITORING_CONTENT_TOTAL_LINES; j++)); do
        printf "${COLOR_BORDER}│${RESET} %-*s ${COLOR_BORDER}│${RESET}\n" "$inner_width" ""
    done
    # --------------------------------------------------
    printf "${COLOR_BORDER}╰"
    for ((i=0; i<cols-2; i++)); do printf "─"; done
    printf "╯${RESET}"
}

# ----------------------------------------------------------------------------------------------------







render_monitoring_window() {
    workflow_tilte="$1"
    monitoring_stream_file="$2"
    workflow_status_file="$3"
    workflow_progress_file="$4"

    spin='|/-\'
    s=0

    COLOR_BORDER="\e[33m"
    RESET="\e[0m"

    rows=$(tput lines)
    cols=$(tput cols)

    WORKFLOW_STATUS_FRAME_TOTAL_LINES=10

    CURRENT_PROGRESS_FRAME_TOTAL_LINES=3


    resized=true
    trap 'resized=true' WINCH # Listen resize in subprocess
    
    tput smcup
    tput clear
    tput civis 
    tput sc

    while true; do
        tput rc
        if $resized; then
            rows=$(tput lines)
            cols=$(tput cols)
            WORKFLOW_STATUS_FRAME_TOTAL_LINES=10
            CURRENT_PROGRESS_FRAME_TOTAL_LINES=3
            MONITORING_FRAME_TOTAL_LINES=$(( $rows - $WORKFLOW_STATUS_FRAME_TOTAL_LINES - $CURRENT_PROGRESS_FRAME_TOTAL_LINES ))
            tput clear
            resized=false
        fi

        render_workflow_status_frame "$cols"
        render_current_progress_frame "$cols"
        render_monitoring_frame "$cols"

        s=$(( (s+1) %4 ))
        sleep 0.25
    done
    tput rmcup
    tput cnorm  
}



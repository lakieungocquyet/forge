# get_cursor_row() {
#     local row col
#     if IFS=';' read -t 0.1 -sdR -p $'\e[6n' row col < /dev/tty; then
#         echo "${row#*[}"
#     else
#         echo ""
#     fi
# }

cyan_color="\e[36m"  # cyan
green_color="\e[32m"   # green
yellow_color="\e[33m" # yellow
red_color="\e[31m"   # red
reset="\e[0m"

# anchor_row=$(get_cursor_row)
# echo $anchor_row

# cleanup() {
#     trap - INT TERM EXIT
#     tput cnorm
#     tput rmcup 2>/dev/null
#     echo -e "\n[!] Exit process!"
#     exit 0
# }

# cleanup_suspend() {
#     tput cnorm
#     tput rmcup 2>/dev/null
# }

# resume() {
#     tput smcup
#     tput clear 
#     tput civis
#     tput sc
# }

# trap 'cleanup_suspend; kill -TSTP $$' TSTP # Pause main process
# trap 'resume' CONT # Resume main process
# trap cleanup INT TERM # End main process
# ----------------------------------------------------------------------------------------------------

render_workflow_status_title() {
    local cols=$1
    local line_width=$cols
    workflow_tilte_len=${#workflow_tilte}
    local padding=$(((line_width - workflow_tilte_len) / 2))
    printf "%*s${yellow_color}%s${reset}%*s\n" $padding "" "$workflow_tilte" $(( line_width - workflow_tilte_len - padding )) ""
}

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
        ((total_rendered++)) || true
    fi
    # --------------------------------------------------
    for ((i=status_offset; i<status_offset+visible_slots && i<total; i++)); do
        IFS='|' read -r step_index step status <<< "${status_lines[$i]}"

        local badge
        local step_index_width=5
        local badge_width=3
        local step_width=$((inner_width - step_index_width - badge_width - 2))

        local badge_color

        case "$status" in
            DONE)
                badge="[✓]"
                badge_color="${green_color}"
                ;;
            RUNNING)
                badge="[${spin:$s:1}]"
                badge_color="${reset}"
                ;;
            PENDING)
                badge="[•]"
                badge_color="${yellow_color}"
                ;;
            FAILED)
                badge="[x]"
                badge_color="${red_color}"
                ;;
            *)
                badge="[$status]"
                badge_color="${reset}"
                ;;
        esac

        printf "${COLOR_BORDER}│${RESET} %-5s %-*s ${badge_color}%-3s${reset} ${COLOR_BORDER}│${RESET}\n" "$step_index" "$step_width" "$step" "$badge"

        ((total_rendered++)) || true
    done
    # --------------------------------------------------
    if $bottom_ellipsis; then
        printf "${COLOR_BORDER}│${RESET} %-*s ${COLOR_BORDER}│${RESET}\n" "$inner_width" "..."
        ((total_rendered++)) || true
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
    local MONITORING_FRAME_TOTAL_LINES=$(( $rows - $WORKFLOW_TITLE_TOTAL_LINES - $WORKFLOW_STATUS_FRAME_TOTAL_LINES - $CURRENT_PROGRESS_FRAME_TOTAL_LINES ))
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
    
    mapfile -t lines < <(
        tail -n "$MONITORING_CONTENT_TOTAL_LINES" "$monitoring_stream_file" \
        | sed -E 's/\x1B\[[0-9;]*[mK]//g' \
        | expand -t 4 \
        | tr -d '\r' \
        | perl -CS -pe 's/\x{202F}|\x{00A0}/ /g' \
        | fold -sw "$inner_width" \
        | tail -n "$MONITORING_CONTENT_TOTAL_LINES"
    )

    local printed=0

    for line in "${lines[@]}"; do
        printf "${COLOR_BORDER}│${RESET} %-*s ${COLOR_BORDER}│${RESET}\n" "$inner_width" "$line"
        ((printed++)) || true
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

    WORKFLOW_TITLE_TOTAL_LINES=1

    WORKFLOW_STATUS_FRAME_TOTAL_LINES=10

    CURRENT_PROGRESS_FRAME_TOTAL_LINES=3


    resized=true
    trap 'resized=true' WINCH # Listen resize in subprocess
    
    trap 'tput rmcup; tput cnorm; exit 0' TERM

    tput smcup
    tput clear
    tput civis 

    while true; do
        tput cup 0 0
        if $resized; then
            rows=$(tput lines)
            cols=$(tput cols)
            WORKFLOW_STATUS_FRAME_TOTAL_LINES=10
            CURRENT_PROGRESS_FRAME_TOTAL_LINES=3
            MONITORING_FRAME_TOTAL_LINES=$(( $rows - $WORKFLOW_STATUS_FRAME_TOTAL_LINES - $CURRENT_PROGRESS_FRAME_TOTAL_LINES ))
            tput clear
            resized=false
        fi

        render_workflow_status_title "$cols"
        render_workflow_status_frame "$cols"
        render_current_progress_frame "$cols"
        render_monitoring_frame "$cols"

        s=$(( (s+1) %4 ))
        sleep 0.5
    done
}



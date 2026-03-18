SCRIPT_DIR_PATH="$(dirname "$(realpath $0)")"
declare -A LEVELS=(
  [DEBUG]=0
  [INFO]=1
  [WARNING]=2
  [ERROR]=3
)

LOG_LEVEL="INFO"
LOG_FILE="${SCRIPT_DIR_PATH}/../../log/monitoring.log"
function logger() {
    local level=$1
    shift
    local message="$*"
    if [ ${LEVELS[$level]} -lt ${LEVELS[$LOG_LEVEL]} ]; then
        return
    fi
    timestamp=$(date -u +"%Y-%m-%d %H:%M:%S")
    case $level in
        DEBUG) color="\e[36m" ;;   # cyan
        INFO) color="\e[32m" ;;    # green
        WARNING) color="\e[33m" ;; # yellow
        ERROR) color="\e[31m" ;;   # red
    esac
    reset="\e[0m"
    # terminal (color)
    echo -e "[\e[32m$timestamp\e[0m] [${color}$level${reset}] $message"
    # echo -e "[\e[32m$timestamp\e[0m] [${color}$level${reset}] ${color}$message${reset}"
    # file (no color)
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}
# INSTALL EMSDK 
SCRIPT_DIR_PATH="$(dirname "$(realpath "$0")")"

mkdir -p "$SCRIPT_DIR_PATH/../sdk/emsdk"

tar -xzf "$SCRIPT_DIR_PATH/../downloads/emsdk-v6.0.13.tar.gz" -C "$SCRIPT_DIR_PATH/../sdk/emsdk"
(
    cd "$SCRIPT_DIR_PATH/../sdk/emsdk/emsdk-6.0.13" && bash emsdk install 6.0.13 && bash emsdk activate 6.0.13
)
source "$SCRIPT_DIR_PATH/../sdk/emsdk/emsdk-6.0.13/emsdk_env.sh"
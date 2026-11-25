SCRIPT_DIR_PATH="$(dirname "$(realpath "$0")")"

EMSDK_VERSION="6.0.13"

if [[ ! -f "$SCRIPT_DIR_PATH/emsdk-v$EMSDK_VERSION.tar.gz" ]] || ! ( cd "$SCRIPT_DIR_PATH" && md5sum -c --quiet "emsdk-v$EMSDK_VERSION.tar.gz.md5" >/dev/null 2>&1 ); then
    wget -O "$SCRIPT_DIR_PATH/emsdk-v$EMSDK_VERSION.tar.gz" \
        https://github.com/emscripten-core/emsdk/archive/refs/tags/6.0.13.tar.gz
    (cd "$SCRIPT_DIR_PATH" && md5sum emsdk-v$EMSDK_VERSION.tar.gz > emsdk-v$EMSDK_VERSION.tar.gz.md5)
fi
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
if [[ ! -f "$SCRIPT_DIR_PATH/tracy-0.9.1.tar.gz" ]] || ! ( cd "$SCRIPT_DIR_PATH" && md5sum -c --quiet "tracy-0.9.1.tar.gz.md5" >/dev/null 2>&1 ); then
    wget -O "$SCRIPT_DIR_PATH/tracy-0.9.1.tar.gz" \
        "https://github.com/gear-genomics/tracy/archive/refs/tags/v0.9.1.tar.gz"

    ( cd "$SCRIPT_DIR_PATH" && md5sum "tracy-0.9.1.tar.gz" > "tracy-0.9.1.tar.gz.md5" )
fi

if [[ ! -f "$SCRIPT_DIR_PATH/sdsl-3.0.4.tar.gz" ]] || ! ( cd "$SCRIPT_DIR_PATH" && md5sum -c --quiet "sdsl-3.0.4.tar.gz.md5" >/dev/null 2>&1 ); then
    wget -O "$SCRIPT_DIR_PATH/sdsl-3.0.4.tar.gz" \
        "https://github.com/xxsds/sdsl-lite/archive/refs/tags/v3.0.4.tar.gz"

    ( cd "$SCRIPT_DIR_PATH" && md5sum "sdsl-3.0.4.tar.gz" > "sdsl-3.0.4.tar.gz.md5" )
fi

if [[ ! -f "$SCRIPT_DIR_PATH/boost-1.90.0-b2-nodocs.tar.gz" ]] || ! ( cd "$SCRIPT_DIR_PATH" && md5sum -c --quiet "boost-1.90.0-b2-nodocs.tar.gz.md5" >/dev/null 2>&1 ); then
    wget -O "$SCRIPT_DIR_PATH/boost-1.90.0-b2-nodocs.tar.gz" \
        "https://github.com/boostorg/boost/releases/download/boost-1.90.0/boost-1.90.0-b2-nodocs.tar.gz"

    ( cd "$SCRIPT_DIR_PATH" && md5sum "boost-1.90.0-b2-nodocs.tar.gz" > "boost-1.90.0-b2-nodocs.tar.gz.md5" )
fi
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# HTSLIB
if [[ ! -f "$SCRIPT_DIR_PATH/htslib-1.24.tar.bz2" ]] || ! ( cd "$SCRIPT_DIR_PATH" && md5sum -c --quiet "htslib-1.24.tar.bz2.md5" >/dev/null 2>&1 ); then
    wget -O "$SCRIPT_DIR_PATH/htslib-1.24.tar.bz2" \
        "https://github.com/samtools/htslib/releases/download/1.24/htslib-1.24.tar.bz2"

    ( cd "$SCRIPT_DIR_PATH" && md5sum "htslib-1.24.tar.bz2" > "htslib-1.24.tar.bz2.md5" )
fi
# XZ
if [[ ! -f "$SCRIPT_DIR_PATH/xz-5.8.4.tar.bz2" ]] || ! ( cd "$SCRIPT_DIR_PATH" && md5sum -c --quiet "xz-5.8.4.tar.bz2.md5" >/dev/null 2>&1 ); then
    wget -O "$SCRIPT_DIR_PATH/xz-5.8.4.tar.bz2" \
        "https://github.com/tukaani-project/xz/releases/download/v5.8.4/xz-5.8.4.tar.bz2"

    ( cd "$SCRIPT_DIR_PATH" && md5sum "xz-5.8.4.tar.bz2" > "xz-5.8.4.tar.bz2.md5" )
fi
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
if [[ ! -f "$SCRIPT_DIR_PATH/bcftools-1.24.tar.bz2" ]] || ! ( cd "$SCRIPT_DIR_PATH" && md5sum -c --quiet "bcftools-1.24.tar.bz2.md5" >/dev/null 2>&1 ); then
    wget -O "$SCRIPT_DIR_PATH/bcftools-1.24.tar.bz2" \
        "https://github.com/samtools/bcftools/releases/download/1.24/bcftools-1.24.tar.bz2"

    ( cd "$SCRIPT_DIR_PATH" && md5sum "bcftools-1.24.tar.bz2" > "bcftools-1.24.tar.bz2.md5" )
fi
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
if [[ ! -f "$SCRIPT_DIR_PATH/samtools-1.24.tar.bz2" ]] || ! ( cd "$SCRIPT_DIR_PATH" && md5sum -c --quiet "samtools-1.24.tar.bz2.md5" >/dev/null 2>&1 ); then
    wget -O "$SCRIPT_DIR_PATH/samtools-1.24.tar.bz2" \
        "https://github.com/samtools/samtools/releases/download/1.24/samtools-1.24.tar.bz2"

    ( cd "$SCRIPT_DIR_PATH" && md5sum "samtools-1.24.tar.bz2" > "samtools-1.24.tar.bz2.md5" )
fi
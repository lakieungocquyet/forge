SCRIPT_DIR_PATH="$(dirname "$(realpath "$0")")"

mkdir -p "$SCRIPT_DIR_PATH/include" "$SCRIPT_DIR_PATH/lib"

mkdir -p "$SCRIPT_DIR_PATH/src/xz"
tar -jxvf "$SCRIPT_DIR_PATH/../../downloads/xz-5.8.4.tar.bz2" -C "$SCRIPT_DIR_PATH/src/xz"

(   cd "$SCRIPT_DIR_PATH/src/xz/xz-5.8.4"
    emconfigure ./configure \
        --host=wasm32-unknown-emscripten \
        --prefix="$SCRIPT_DIR_PATH" \
        --enable-static --disable-shared \
        --disable-xz --disable-xzdec --disable-lzmadec --disable-lzmainfo \
        --disable-scripts --disable-doc --disable-nls \
        --disable-threads

    emmake make -j4
    emmake make install
)

mkdir -p "$SCRIPT_DIR_PATH/src/htslib"
tar -jxvf "$SCRIPT_DIR_PATH/../../downloads/htslib-1.24.tar.bz2" -C "$SCRIPT_DIR_PATH/src/htslib"
(
    cd "$SCRIPT_DIR_PATH/src/htslib/htslib-1.24"
    make distclean 2>/dev/null

    emconfigure ./configure \
        --host=wasm32-unknown-emscripten \
        CFLAGS="-O2 -sUSE_ZLIB=1 -sUSE_BZIP2=1" \
        CPPFLAGS="-I$SCRIPT_DIR_PATH/include" \
        LDFLAGS="-L$SCRIPT_DIR_PATH/lib -sUSE_ZLIB=1 -sUSE_BZIP2=1" \
        --disable-libcurl --disable-plugins --disable-gcs --disable-s3

    grep -i lzma config.h

    # Chỉ build static lib, bỏ qua libhts.so và test
    emmake make -j4 libhts.a

    # Cài đặt thủ công
    cp libhts.a "$SCRIPT_DIR_PATH/lib/"
    cp -r htslib "$SCRIPT_DIR_PATH/include/"
)
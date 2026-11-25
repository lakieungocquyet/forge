SCRIPT_DIR_PATH="$(dirname "$(realpath "$0")")"
mkdir -p "$SCRIPT_DIR_PATH/../../dist/bcftools"

tar -jxvf  "$SCRIPT_DIR_PATH/../../downloads/bcftools-1.24.tar.bz2" -C "$SCRIPT_DIR_PATH"
tar -jxvf "$SCRIPT_DIR_PATH/../../downloads/htslib-1.24.tar.bz2" -C "$SCRIPT_DIR_PATH"

# cp -r $SCRIPT_DIR_PATH/bcftools-1.24/. $SCRIPT_DIR_PATH/bcftools-1.24-orig/ 
# cp -r $SCRIPT_DIR_PATH/bcftools-1.24/. $SCRIPT_DIR_PATH/bcftools-1.24-wasm/ 
# After modify
# (
#     cd "$SCRIPT_DIR_PATH" && \
#     diff -ruN bcftools-1.24-orig bcftools-1.24-wasm > bcftools-1.24.patch
# ) 

( 
    cd "$SCRIPT_DIR_PATH/bcftools-1.24" && patch -p1 < "$SCRIPT_DIR_PATH/bcftools-1.24.patch"
)

(
    cd "$SCRIPT_DIR_PATH/htslib-1.24"

    emconfigure ./configure \
        --host=wasm32-unknown-emscripten \
        --disable-libcurl --disable-plugins --disable-gcs --disable-s3 \
        CPPFLAGS="-I$SCRIPT_DIR_PATH/../libs/include" \
        LDFLAGS="-L$SCRIPT_DIR_PATH/../libs/lib"
)

(
    cd "$SCRIPT_DIR_PATH/bcftools-1.24"
    make clean

    autoreconf -i -Wno-syntax

    emconfigure ./configure \
        --host=wasm32-unknown-emscripten \
        --with-htslib="$SCRIPT_DIR_PATH/htslib-1.24" \
        CFLAGS="-O2 -s USE_ZLIB=1 -s USE_BZIP2=1 -I$SCRIPT_DIR_PATH/../libs/include" \
        LDFLAGS="-O2 -s USE_ZLIB=1 -s USE_BZIP2=1 -L$SCRIPT_DIR_PATH/../libs/lib"

    mkdir -p $SCRIPT_DIR_PATH/build

    emmake make bcftools CC=emcc AR=emar \
        CFLAGS="-O2 -s USE_ZLIB=1 -s USE_BZIP2=1 -I$SCRIPT_DIR_PATH/../libs/include" \
        LDFLAGS="-O2 -s USE_ZLIB=1 -s USE_BZIP2=1 -L$SCRIPT_DIR_PATH/../libs/lib \
            -lworkerfs.js \
            -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=createBcftools \
            -s ENVIRONMENT=web,worker \
            -s INVOKE_RUN=0 \
            -s EXIT_RUNTIME=1 \
            -s FORCE_FILESYSTEM=1 \
            -s EXPORTED_RUNTIME_METHODS=callMain,FS,WORKERFS \
            -s ALLOW_MEMORY_GROWTH=1 \
            -s ERROR_ON_UNDEFINED_SYMBOLS=1" \
        LIBS="-llzma" \

    cp -r "$SCRIPT_DIR_PATH/build/." "$SCRIPT_DIR_PATH/../../dist/bcftools/"
)
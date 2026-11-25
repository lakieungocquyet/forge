#!/usr/bin/env bash
SCRIPT_DIR_PATH="$(dirname "$(realpath "$0")")"
mkdir -p "$SCRIPT_DIR_PATH/../../dist/tracy"

tar -zxvf "$SCRIPT_DIR_PATH/../../downloads/tracy-0.9.1.tar.gz" -C "$SCRIPT_DIR_PATH"
tar -zxvf "$SCRIPT_DIR_PATH/../../downloads/sdsl-3.0.4.tar.gz"  -C "$SCRIPT_DIR_PATH"
tar -jxvf "$SCRIPT_DIR_PATH/../../downloads/htslib-1.24.tar.bz2" -C "$SCRIPT_DIR_PATH"
tar -zxvf "$SCRIPT_DIR_PATH/../../downloads/boost-1.90.0-b2-nodocs.tar.gz" -C "$SCRIPT_DIR_PATH"

mkdir -p \
	"$SCRIPT_DIR_PATH/tracy-0.9.1/src/htslib" \
	"$SCRIPT_DIR_PATH/tracy-0.9.1/src/xxsds"
cp -r \
  	"$SCRIPT_DIR_PATH/htslib-1.24/." \
  	"$SCRIPT_DIR_PATH/tracy-0.9.1/src/htslib/"
cp -r \
	"$SCRIPT_DIR_PATH/sdsl-lite-3.0.4/." \
	"$SCRIPT_DIR_PATH/tracy-0.9.1/src/xxsds/"

# ---- sdsl (header) ----
mkdir -p "$SCRIPT_DIR_PATH/tracy-0.9.1/src/xxsds/build"
(
	cd "$SCRIPT_DIR_PATH/tracy-0.9.1/src/xxsds/build"
	cmake -DCMAKE_INSTALL_PREFIX=../../sdslLite \
	-DSDSL_BUILD_TESTS=OFF -DSDSL_BUILD_EXAMPLES=OFF -DSDSL_BUILD_TUTORIAL=OFF ..
	make -j8 sdsl
	make install
	mkdir -p ../../sdslLite/include
	cp -r --update=none ../include/sdsl ../../sdslLite/include/
	find .. -name 'divsufsort*.h' -exec cp --update=none {} ../../sdslLite/include/ \;
	ls ../../sdslLite/include
)

# ---- htslib -> WASM ----
(
	cd "$SCRIPT_DIR_PATH/tracy-0.9.1/src/htslib" 
	make distclean || true
	emconfigure ./configure \
	--host=wasm32-unknown-emscripten \
	--disable-s3 --disable-gcs --disable-libcurl --disable-plugins \
	--disable-lzma --disable-bz2 --without-libdeflate
	emmake make lib-static -j8
	ls -la libhts.a
)

# ---- Boost -> WASM ----
(
	cd "$SCRIPT_DIR_PATH/boost-1.90.0"
	./bootstrap.sh
	./b2 headers
	embuilder build zlib
	cat > user-config.jam <<'EOF'
using clang : emscripten : em++ : <archiver>emar <ranlib>emranlib <linker>em++ ;
EOF
	./b2 --user-config=user-config.jam toolset=clang-emscripten \
		link=static runtime-link=static threading=single variant=release \
		cxxflags="-fexceptions -std=c++17" linkflags="-fexceptions" \
		-sNO_BZIP2=1 -sNO_LZMA=1 -sNO_ZSTD=1 \
		-sZLIB_INCLUDE="$(em-config CACHE)/sysroot/include" \
		-sZLIB_LIBPATH="$(em-config CACHE)/sysroot/lib/wasm32-emscripten" \
		-sZLIB_BINARY=z \
		--with-iostreams --with-filesystem --with-program_options \
		--stagedir=../boost-wasm stage -j8 || true
	ls ../boost-wasm/lib
)

# ---- Tracy -> WASM ----
(
	cd "$SCRIPT_DIR_PATH"
	em++ -std=c++17 -O3 -fno-tree-vectorize -DNDEBUG -fexceptions \
		-DBOOST_ASIO_DISABLE_THREADS \
		-isystem "$SCRIPT_DIR_PATH/tracy-0.9.1/src/jlib" \
		-isystem "$SCRIPT_DIR_PATH/tracy-0.9.1/src/htslib" \
		-isystem "$SCRIPT_DIR_PATH/tracy-0.9.1/src/sdslLite/include" \
		-isystem "$SCRIPT_DIR_PATH/boost-1.90.0" \
		"$SCRIPT_DIR_PATH/tracy-0.9.1/src/tracy.cpp" \
		-o "$SCRIPT_DIR_PATH/../../dist/tracy/tracy.js" \
		"$SCRIPT_DIR_PATH/boost-wasm/lib/libboost_iostreams.a" \
		"$SCRIPT_DIR_PATH/boost-wasm/lib/libboost_filesystem.a" \
		"$SCRIPT_DIR_PATH/boost-wasm/lib/libboost_program_options.a" \
		"$SCRIPT_DIR_PATH/tracy-0.9.1/src/htslib/libhts.a" \
		-sUSE_ZLIB=1 \
		-sALLOW_MEMORY_GROWTH=1 -sSTACK_SIZE=5MB \
		-sFORCE_FILESYSTEM=1 \
		-lworkerfs.js \
		-sMODULARIZE=1 -sEXPORT_NAME=createTracy -sEXPORT_ES6=1 \
		-sINVOKE_RUN=0 -sEXIT_RUNTIME=0 \
		-sEXPORTED_RUNTIME_METHODS=callMain,FS,WORKERFS

	ls -la "$SCRIPT_DIR_PATH/../../dist/tracy"
)